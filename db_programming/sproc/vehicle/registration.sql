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

    -- 1) Validate owner is a Driver or Company Representative AND Validated
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

    -- 2) Validate VehicleType exists (if you have a VehicleType table)
    IF NOT EXISTS (
        SELECT 1
        FROM [dbo].[VehicleType] VT
        WHERE VT.VehicleTypeId = @VehicleTypeId
    )
    BEGIN
        RAISERROR('Invalid VehicleTypeId.', 16, 1);
        RETURN;
    END;

    -- 3) Validate seats
    IF @Seats <= 0
    BEGIN
        RAISERROR('Seats must be greater than zero.', 16, 1);
        RETURN;
    END;

    -- 4) Insert vehicle
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
        Status,        -- start in Pending
        Verified       -- not verified yet
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
