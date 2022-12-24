const { Sequelize, DataTypes } = require('sequelize');

const Database = {}

Database.init = (sequelize) => {
  const Instance = sequelize.define('Instance', {
    "instancePrefix": {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    "instanceUrl": {
      type: DataTypes.STRING,
      allowNull: false
    },
    "qrPassword": {
      type: DataTypes.STRING,
      allowNull: true
    },
    "cookie": {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    timestamps: true
  })

  const Entry = sequelize.define('Entry', {
    "entryNumber": {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    "judgingNumber": {
      type: DataTypes.STRING,
      allowNull: false
    },
    "category": {
      type: DataTypes.STRING,
      allowNull: false
    },
    "subcat": {
      type: DataTypes.STRING,
      allowNull: false
    },
    "flight": {
      type: DataTypes.STRING,
      allowNull: false
    },
    "box1": {
      type: DataTypes.STRING,
      allowNull: true
    },
    "box2": {
      type: DataTypes.STRING,
      allowNull: true
    },
    "box3": {
      type: DataTypes.STRING,
      allowNull: true
    },
    "box4": {
      type: DataTypes.STRING,
      allowNull: true
    },
    "checkedIn": {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    "checkinSystem": {
      type: DataTypes.STRING,
      allowNull: true
    },
    "auditId": {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    timestamps: true
  })

  Entry.belongsTo(Instance, { as: "Instance", constraints: false, foreignKey: "instancePrefix"})
  Instance.hasMany(Entry, {as: "Entry", constraints: false, foreignKey: 'instancePrefix'})
  
  sequelize.sync({force: true}) 

  return [
    Entry,
    Instance
  ]
}

module.exports = Database