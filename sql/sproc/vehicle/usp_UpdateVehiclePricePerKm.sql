CREATE OR ALTER PROCEDURE [dbo].[usp_UpdateVehiclePricePerKm]
(
    @VehicleId     UNIQUEIDENTIFIER,
    @OwnerUserId   UNIQUEIDENTIFIER,
    @PricePerKm    DECIMAL(10,2)
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate PricePerKm
    IF @PricePerKm IS NULL OR @PricePerKm <= 0
    BEGIN
        RAISERROR('PricePerKm must be greater than zero.', 16, 1);
        RETURN;
    END;

    -- Verify vehicle exists and belongs to the user
    IF NOT EXISTS (
        SELECT 1
        FROM [dbo].[Vehicle]
        WHERE VehicleId = @VehicleId
          AND OwnerUserId = @OwnerUserId
    )
    BEGIN
        RAISERROR('Vehicle not found or you do not own this vehicle.', 16, 1);
        RETURN;
    END;

    -- Update the price
    UPDATE [dbo].[Vehicle]
    SET PricePerKm = @PricePerKm
    WHERE VehicleId = @VehicleId
      AND OwnerUserId = @OwnerUserId;

    -- Return success
    SELECT 
        VehicleId,
        PricePerKm,
        'Price updated successfully' AS Message
    FROM [dbo].[Vehicle]
    WHERE VehicleId = @VehicleId;
END;
GO
