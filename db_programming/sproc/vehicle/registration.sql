CREATE OR ALTER PROCEDURE [dbo].[usp_AddVehicle]
(
    @OwnerUserId    UNIQUEIDENTIFIER,
    @VehicleTypeId  INT,
    @PlateNumber    NVARCHAR(20),
    @Brand          NVARCHAR(50),
    @Model          NVARCHAR(50),
    @Color          NVARCHAR(30),
    @Seats          INT,
    @CargoVolume    DECIMAL(10,2) = 0,
    @CargoWeight    DECIMAL(10,2) = 0
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate owner is a Driver or Company Representative AND Verified
    IF NOT EXISTS (
        SELECT 1
        FROM [dbo].[User] U
        WHERE U.UserId = @OwnerUserId
          AND U.Role IN ('D', 'C')
          AND U.Verified = 1
    )
    BEGIN
        RAISERROR('Owner must be an existing Driver or Company Representative and be verified.', 16, 1);
        RETURN;
    END;

    -- Validate plate number format 
    IF @PlateNumber NOT LIKE '[A-Z][A-Z][A-Z][0-9][0-9][0-9]'
    BEGIN
        RAISERROR('Plate number must be in the format ABC123 (three letters followed by three digits).', 16, 1);
        RETURN;
    END;

    -- Validate plate number uniqueness
    IF EXISTS (
        SELECT 1
        FROM [dbo].[Vehicle]
        WHERE PlateNumber = @PlateNumber
    )
    BEGIN
        RAISERROR('Plate number must be unique.', 16, 1);
        RETURN;
    END;

    -- Validate VehicleType exists and fetch constraints
    DECLARE
        @TypeSeats       INT,
        @TypeMinVolume   DECIMAL(10,2),
        @TypeMinWeight   DECIMAL(10,2);

    SELECT
        @TypeSeats     = VT.NumOfSeats,
        @TypeMinVolume = VT.MinCargoVolume,
        @TypeMinWeight = VT.MinCargoWeight
    FROM dbo.VehicleType VT
    WHERE VT.VehicleTypeId = @VehicleTypeId;

    IF @TypeSeats IS NULL
    BEGIN
        RAISERROR('Invalid VehicleTypeId.', 16, 1);
        RETURN;
    END;

    -- Seats validation
    IF @Seats <= 0
    BEGIN
        RAISERROR('Seats must be greater than zero.', 16, 1);
        RETURN;
    END;

    IF @Seats > @TypeSeats
    BEGIN
        RAISERROR('Number of seats exeeds limit for the selected vehicle type.', 16, 1);
        RETURN;
    END;

    -- Cargo capability validations
    IF @CargoVolume < @TypeMinVolume
    BEGIN
        RAISERROR('Cargo volume is less than the minimum required for the selected vehicle type.', 16, 1);
        RETURN;
    END;

    IF @CargoWeight < @TypeMinWeight
    BEGIN
        RAISERROR('Cargo weight capacity is less than the minimum required for the selected vehicle type.', 16, 1);
        RETURN;
    END;

    -- Insert vehicle
    DECLARE @VehicleId UNIQUEIDENTIFIER = NEWID();

    INSERT INTO [dbo].[Vehicle]
    (
        VehicleId,
        VehicleTypeId,
        OwnerUserId,
        PlateNumber,
        Brand,
        Model,
        Color,
        Seats,
        CargoVolume,
        CargoWeight,
        Status,
        Verified
    )
    VALUES
    (
        @VehicleId,
        @VehicleTypeId,
        @OwnerUserId,
        @PlateNumber,
        @Brand,
        @Model,
        @Color,
        @Seats,
        @CargoVolume,
        @CargoWeight,
        'Pending',
        0
    );

    SELECT @VehicleId AS VehicleId;
END;
GO
