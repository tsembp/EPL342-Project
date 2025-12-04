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
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

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

        -- Create a PENDING payment record with breakdown (not completed yet)
        DECLARE @PassengerId     UNIQUEIDENTIFIER;
        DECLARE @DriverId        UNIQUEIDENTIFIER;
        DECLARE @PriceFinal      DECIMAL(12,2);
        DECLARE @ExistingPayment UNIQUEIDENTIFIER;

        SELECT
            @PassengerId     = r.PassengerUserId,
            @DriverId        = r.DriverUserId,
            @PriceFinal      = r.PriceFinal,
            @ExistingPayment = r.Payment
        FROM dbo.Ride r
        WHERE r.RideId = @RideId;

        -- Only create payment if one doesn't exist
        IF @ExistingPayment IS NULL
        BEGIN
            DECLARE @GrossAmount  DECIMAL(10,2);
            DECLARE @OsrhFee      DECIMAL(10,2);
            DECLARE @DriverPayout DECIMAL(10,2);
            DECLARE @PaymentId    UNIQUEIDENTIFIER;

            SET @GrossAmount  = @PriceFinal;
            SET @OsrhFee      = ROUND(@GrossAmount * (@PlatformFeePercent / 100.0), 2);
            SET @DriverPayout = @GrossAmount - @OsrhFee;

            IF @DriverPayout < 0
                SET @DriverPayout = 0;

            SET @PaymentId = NEWID();

            -- Insert Payment row with PENDING status
            INSERT INTO dbo.Payment (
                PaymentId,
                SenderUserId,
                ReceiverUserId,
                GrossAmount,
                OsrhFee,
                DriverPayout,
                PaidAt,
                Method,
                Status
            )
            VALUES (
                @PaymentId,
                @PassengerId,
                @DriverId,
                @GrossAmount,
                @OsrhFee,
                @DriverPayout,
                NULL,  -- PaidAt will be set when payment is completed
                @PaymentMethod,
                'Pending'  -- Payment is pending until passenger pays
            );

            -- Link payment to ride
            UPDATE dbo.Ride
            SET Payment = @PaymentId
            WHERE RideId = @RideId;

            COMMIT TRANSACTION;

            -- Return payment details to show driver what they'll earn
            SELECT
                'SUCCESS'       AS Result,
                @RideId         AS RideId,
                @PaymentId      AS PaymentId,
                @PriceFinal     AS FinalPrice,
                @GrossAmount    AS GrossAmount,
                @OsrhFee        AS PlatformFee,
                @DriverPayout   AS DriverPayout,
                @PaymentMethod  AS PaymentMethod,
                'Pending'       AS PaymentStatus,
                'Ride ended, payment pending.' AS Message;
        END
        ELSE
        BEGIN
            COMMIT TRANSACTION;
            
            SELECT
                'SUCCESS'       AS Result,
                @RideId         AS RideId,
                @ExistingPayment AS PaymentId,
                @PriceFinal     AS FinalPrice,
                'Ride already has a payment.' AS Message;
        END;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT          = ERROR_SEVERITY();
        DECLARE @ErrorState INT             = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO
