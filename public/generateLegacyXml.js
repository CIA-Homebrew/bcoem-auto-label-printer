const generateLegacyXML = (scannedEntry, boxId) => `<?xml version="1.0" encoding="utf-8"?>
  <DieCutLabel Version="8.0" Units="twips">
    <PaperOrientation>Landscape</PaperOrientation>
    <Id>Address</Id>
    <PaperName>30252 Address</PaperName>\
    <DrawCommands>
        <RoundRectangle X="0" Y="0" Width="1440" Height="1440" Rx="270" Ry="270" />
    </DrawCommands>

    <ObjectInfo>
      <TextObject>
        <Name>Top Text</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
        <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation0</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Top</VerticalAlignment>
        <TextFitMode>ShrinkToFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String># ${scannedEntry.judgingNumber}</String>
            <Attributes>
              <Font Family="Arial" Size="10" Bold="True" Italic="False" Underline="False" Strikeout="False" />
              <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
            </Attributes>
          </Element>
        </StyledText>
      </TextObject>
      <Bounds X="144" Y="120" Width="1440" Height="300" />
    </ObjectInfo>
    <ObjectInfo>
      <TextObject>
        <Name>Top Text</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
        <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation90</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Top</VerticalAlignment>
        <TextFitMode>ShrinkToFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String>${scannedEntry.uuid}</String>
            <Attributes>
              <Font Family="Arial" Size="5" Bold="True" Italic="False" Underline="False" Strikeout="False" />
              <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
            </Attributes>
          </Element>
        </StyledText>
      </TextObject>
      <Bounds X="1500" Y="120" Width="300" Height="300" />
    </ObjectInfo>
    <ObjectInfo>
      <TextObject>
        <Name>Top Text</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
        <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation0</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Top</VerticalAlignment>
        <TextFitMode>ShrinkToFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String>${scannedEntry[boxId] && boxId !== "records" ? "Box:" : ""}${scannedEntry[boxId] || ""} Cat:${scannedEntry.category}${scannedEntry.subcat}</String>
            <Attributes>
              <Font Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False" />
              <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
            </Attributes>
          </Element>
        </StyledText>
      </TextObject>
      <Bounds X="144" Y="400" Width="1440" Height="300" />
    </ObjectInfo>
    <ObjectInfo>
      <TextObject>
        <Name>Top Text</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
        <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation0</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Top</VerticalAlignment>
        <TextFitMode>ShrinkToFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String>${boxId === 'record' ? "FOR RECORDS" : (scannedEntry[boxId] === null || scannedEntry[boxId] === undefined) ? "SPARE ENTRY" : boxId === 'box3' ? "Flight: 2nd Round" : boxId === 'box4' ? "Flight: BOS" : "FlightID: " + scannedEntry.flight}</String>
            <Attributes>
              <Font Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False" />
              <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
            </Attributes>
          </Element>
        </StyledText>
      </TextObject>
      <Bounds X="144" Y="578" Width="1440" Height="300" />
    </ObjectInfo>
    <ObjectInfo>
      <TextObject>
        <Name>Top Text</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
        <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation0</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Top</VerticalAlignment>
        <TextFitMode>ShrinkToFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String># ${scannedEntry.judgingNumber}</String>
            <Attributes>
              <Font Family="Arial" Size="10" Bold="True" Italic="False" Underline="False" Strikeout="False" />
              <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
            </Attributes>
          </Element>
        </StyledText>
      </TextObject>
      <Bounds X="144" Y="840" Width="1440" Height="300" />
    </ObjectInfo>
    <ObjectInfo>
      <TextObject>
        <Name>Top Text</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
        <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation90</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Top</VerticalAlignment>
        <TextFitMode>ShrinkToFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String>${scannedEntry.uuid}</String>
            <Attributes>
              <Font Family="Arial" Size="5" Bold="True" Italic="False" Underline="False" Strikeout="False" />
              <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
            </Attributes>
          </Element>
        </StyledText>
      </TextObject>
      <Bounds X="1500" Y="840" Width="300" Height="300" />
    </ObjectInfo>
    <ObjectInfo>
      <TextObject>
        <Name>Top Text</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
        <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation0</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Top</VerticalAlignment>
        <TextFitMode>ShrinkToFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String>${scannedEntry[boxId] && boxId !== "records" ? "Box:" : ""}${scannedEntry[boxId] || ""} Cat:${scannedEntry.category}${scannedEntry.subcat}</String>
            <Attributes>
              <Font Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False" />
              <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
            </Attributes>
          </Element>
        </StyledText>
      </TextObject>
      <Bounds X="144" Y="1025" Width="1440" Height="125" />
    </ObjectInfo>

    <ObjectInfo>
      <BarcodeObject>
          <Name>Barcode</Name>
          <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
          <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
          <Rotation>Rotation0</Rotation>
          <IsMirrored>False</IsMirrored>
          <IsVariable>True</IsVariable>
          <Text>${scannedEntry.uuid}</Text>
          <Type>Code128Auto</Type>
          <Size>Small</Size>
          <TextPosition>None</TextPosition>
          <TextFont Family="Arial" Size="8" Bold="False" Italic="False"
                          Underline="False" Strikeout="False" />
          <CheckSumFont Family="Arial" Size="8" Bold="False" Italic="False"
                              Underline="False" Strikeout="False" />
          <TextEmbedding>None</TextEmbedding>
          <ECLevel>0</ECLevel>
          <HorizontalAlignment>Center</HorizontalAlignment>
          <QuietZonesPadding Left="0" Top="0" Right="0" Bottom="0" />
      </BarcodeObject>
      <Bounds X="0" Y="1200" Width="1200" Height="250" />
    </ObjectInfo>
  </DieCutLabel>`