CREATE OR ALTER PROCEDURE dbo.usp_UpdateVehicleLocation
    @VehicleId UNIQUEIDENTIFIER,
    @Lat       DECIMAL(9,6),
    @Lng       DECIMAL(9,6)
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- 1. Basic validation on coordinates
    ------------------------------------------------------------
    IF (@Lat < -90 OR @Lat > 90 OR @Lng < -180 OR @Lng > 180)
    BEGIN
        ;THROW 51000, 'Invalid latitude/longitude range.', 1;
    END;

    ------------------------------------------------------------
    -- 2. Ensure vehicle exists AND is verified (and optionally active)
    ------------------------------------------------------------
    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Vehicle v
        WHERE v.VehicleId = @VehicleId
          AND v.Verified = 1
          AND (v.Status = 'Active' OR v.Status IS NULL) -- adjust if you use different statuses
    )
    BEGIN
        ;THROW 51001, 'Vehicle does not exist, is not verified, or not active.', 1;
    END;

    ------------------------------------------------------------
    -- 3. UPSERT into VehicleLocationLive
    ------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM dbo.VehicleLocationLive WHERE VehicleId = @VehicleId)
    BEGIN
        UPDATE dbo.VehicleLocationLive
        SET Lat       = @Lat,
            Lng       = @Lng,
            UpdatedAt = SYSUTCDATETIME()
        WHERE VehicleId = @VehicleId;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.VehicleLocationLive (VehicleId, Lat, Lng, UpdatedAt)
        VALUES (@VehicleId, @Lat, @Lng, SYSUTCDATETIME());
    END;
END;
GO
