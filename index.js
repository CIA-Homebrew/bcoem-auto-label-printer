

const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const { Op, Sequelize } = require('sequelize');

const Database = require('./db')
const BCOEM = require('./bcoem')

const app = express()
let port = 3000

let sequelize

if (process.env.NODE_ENV === "development") {
  require('dotenv').config() 
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'db.sqlite'
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME, 
    process.env.DB_USERNAME, 
    process.env.DB_PASSWORD, 
    {
      host: process.env.DB_ADDRESS,
      dialect: 'mysql'
    }
  );
  port = 80
}

[Entry, Instance] = Database.init(sequelize)

// Body parser middleware
app.use(bodyParser.json({limit: '50mb'}))

// Simple static token middleware
const passphraseMiddleware = (req, res, next) => {
  const passphrase = process.env.PASSPHRASE

  if (passphrase && req.headers.passphrase === passphrase) {
    return next()
  } else if (!passphrase) {
    console.warn("Warning: No passphrase set!")
    return next()
  }

  return res.status(400).json({"error": "invalid passphrase"})
}

app.post('/login', passphraseMiddleware, async (req, res) => {
  const instanceUrl = req.body.instanceUrl
  const qrPassword = req.body.qrPassword
  const instancePrefix = req.body.instancePrefix || ""

  console.log(instanceUrl, qrPassword, instancePrefix)

  if (!(instanceUrl && qrPassword)) {
    return res.status(400).json({"error": "missing parameters"})
  }

  const cookie = await BCOEM.login(
    instanceUrl, 
    qrPassword
  )

  if (!cookie) {
    return res.status(400).json({"error":"bcoem login failed"})
  }

  const [instance, created] = await Instance.upsert({
    instancePrefix: instancePrefix || "",
    instanceUrl,
    cookie,
    qrPassword
  })
  .catch(err => {
    res.status(500).json({"error": err})
  })

  res.status(200).json(instance)
})

app.post('/logout', passphraseMiddleware, async (req, res) => {
  const instancePrefix = req.body.instancePrefix || ""

  await Instance.destroy({
    where: {
      instancePrefix
    }
  })

  res.status(200).json({"destroy": instancePrefix})
})

app.post('/reconnect', passphraseMiddleware, async (req, res) => {
  const instancePrefix = req.body.instancePrefix || ""

  const instance = await Instance.findOne({
    where: {
      instancePrefix
    }
  })

  const cookie = await BCOEM.login(
    instance.instanceUrl, 
    instance.qrPassword
  )

  if (!cookie) {
    return res.status(400).json({"error":"bcoem login failed"})
  }

  await Instance.update({
    cookie
  }, {
    where: {
      instancePrefix
    }
  })

  return res.status(200).json(
    {
      instanceUrl: instance.instanceUrl,
      instancePrefix: instance.instancePrefix,
      currentStatus: true
    }
  )
})

app.get('/connectionstatus', passphraseMiddleware, async (req, res) => {
  const instances = await Instance.findAll()

  const checkedInstances = await Promise.all(
    instances.map(async instance => {
      instance.currentStatus = false

      if (!instance.cookie) {
        return {
          instanceUrl: instance.instanceUrl,
          instancePrefix: instance.instancePrefix,
          currentStatus: false
        }
      }

      const status = await BCOEM.getConnectionStatus(
        instance.instanceUrl,
        instance.cookie
      )

      if (!status) {
        await Instance.update({
          cookie: null
        }, {
          where: {
            instancePrefix: instance.instancePrefix
          }
        })
      }

      return {
        instanceUrl: instance.instanceUrl,
        instancePrefix: instance.instancePrefix,
        currentStatus: status
      }
    })
  )

  res.status(200).json(checkedInstances)
})

app.get('/allentries', passphraseMiddleware, async (req, res) => {
  const entries = await Entry.findAll()

  res.status(200).json(entries)
})

app.post('/checkin', passphraseMiddleware, async (req, res) => {
  const entryNumber = req.body.entryNumber
  let bcoemEntryNumber = req.body.entryNumber
  const checkinSystem = req.body.checkinSystem || null
  const auditId = req.body.auditId || null
  const instancePrefix = entryNumber.replace(/[0-9]/g, "")

  if (!entryNumber) {
    return res.status(400).json({"error": "entry number missing"})
  }

  if (instancePrefix.length) {
    bcoemEntryNumber = entryNumber.replace(instancePrefix, "")
  }

  const instance = await Instance.findOne({
    where: {
      instancePrefix
    }
  })
  .catch(err => {
    return res.status(500).json({"error": err})
  })

  if (!instance) {
    return res.status(400).json({"error": "instance does not exist!"})
  }
  if (!instance.instanceUrl) {
    return res.status(400).json({"error": "instance ID missing"})
  }
  if (!instance.cookie) {
    return res.status(400).json({"error": "instance not logged in"})
  }

  // Check in entry here
  const checkinSuccess = await BCOEM.checkInEntry(
    instance.instanceUrl,
    bcoemEntryNumber,
    instance.cookie
  )

  if (checkinSuccess === false) {
    await Instance.update({
      cookie: null
    }, {
      where: {
        instancePrefix
      }
    })
    return res.status(400).json({"error": "bcoem password error"})
  } else if (checkinSuccess === null) {
    return res.status(400).json({"error": "bcoem checkin error"})
  }

  const entry = await Entry.update({
    checkedIn: true,
    checkinSystem: checkinSystem,
    auditId: auditId
  }, {
    where: {
      entryNumber
    }
  })
  .then(() => {
    return Entry.findOne({
      where: {
        entryNumber
      }
    })
  })
  .catch(err => {
    res.status(500).json({"error": err})
  })

  res.status(200).json(entry)
})

app.post('/upload', passphraseMiddleware, async (req, res) => {
  let allEntries = Object.values(req.body.entries)
  const instancePrefix = req.body.instancePrefix || ""

  if (instancePrefix.length) {
    allEntries = allEntries.map(entry => ({
      ...entry,
      entryNumber: instancePrefix+String(entry.entryNumber),
      instancePrefix
    }))
  } else {
    allEntries = allEntries.map(entry => ({
      ...entry,
      instancePrefix
    }))
  }

  await Entry.bulkCreate(
    allEntries,
    { 
      include: [
        {
          model: Instance,
          as: "Instance"
        }
      ]
    }
  )
  .catch(err => {
    console.error(err)
    return res.status(500).json({"error": err})
  })

  res.status(200).json({"succss": "success"})
})

app.post('/box', passphraseMiddleware, async (req, res) => {
  const boxId = req.body.boxId

  const boxEntries = await Entry.findAll({
    where: {
      [Op.or]: [
        {box1: boxId},
        {box2: boxId},
        {box3: boxId},
        {box4: boxId},
      ]
    }
  })

  res.status(200).json(boxEntries)
})

app.post('/updateuuid', passphraseMiddleware, async (req, res) => {
  const entryNumber = req.body.entryNumber
  const originalAuditId = req.body.originalAuditId
  const updatedAuditId = req.body.updatedAuditId

  if (!entryNumber) {
    return res.status(400).json({"error": "entry number missing"})
  }
  if (!(originalAuditId && updatedAuditId)) {
    return res.status(400).json({"error": "audit number missing"})
  }

  const originalEntry = await Entry.findOne({
    where: {
      entryNumber
    }
  })

  const newAudit = JSON.parse(originalEntry.auditId)

  newAudit[originalEntry.auditId.indexOf(originalAuditId)] = updatedAuditId

  const entry = await Entry.update({
    auditId: newAudit
  }, {
    where: {
      entryNumber
    }
  })
  .then(() => {
    return Entry.findOne({
      where: {
        entryNumber
      }
    })
  })
  .catch(err => {
    res.status(500).json({"error": err})
  })

  res.status(200).json(entry)
})

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + "/pages/index.html"))
})

app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname + "/pages/verify.html"))
})

app.get('/setup', (req, res) => {
  res.sendFile(path.join(__dirname + "/pages/setup.html"))
})

app.use(express.static('public'))

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})