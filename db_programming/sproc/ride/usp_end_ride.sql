CREATE OR ALTER PROCEDURE dbo.usp_Driver_EndRide
(
    @DriverUserId       UNIQUEIDENTIFIER,
    @RideId             INT,
    @PaymentMethod      NVARCHAR(20) = N'Cash',
    @PlatformFeePercent DECIMAL(5,2) = 15.0
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AssignedDriver UNIQUEIDENTIFIER;

    SELECT
        @AssignedDriver = r.DriverUserId
    FROM dbo.Ride AS r
    WHERE r.RideId = @RideId;

    IF @AssignedDriver IS NULL
    BEGIN
        RAISERROR('Ride not found.', 16, 1);
        RETURN;
    END;

    IF @AssignedDriver <> @DriverUserId
    BEGIN
        RAISERROR('Ride does not belong to this driver.', 16, 1);
        RETURN;
    END;

    -- First complete the ride (calculate price, set status, etc.)
    EXEC dbo.usp_CompleteRide
         @RideId = @RideId;

    -- Then create the payment record with breakdown
    EXEC dbo.usp_CompleteRidePayment
         @RideId = @RideId,
         @PaymentMethod = @PaymentMethod,
         @PlatformFeePercent = @PlatformFeePercent;
END;
GO
