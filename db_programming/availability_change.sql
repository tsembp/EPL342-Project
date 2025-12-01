ALTER TABLE dbo.DriverAvailability
ADD IsLocked BIT NOT NULL
    CONSTRAINT DF_DriverAvailability_IsLocked DEFAULT 0;
