IF OBJECT_ID('dbo.usp_CompleteRidePayment', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CompleteRidePayment;
GO

CREATE PROCEDURE dbo.usp_CompleteRidePayment
    @RideId             INT,
    @PaymentMethod      NVARCHAR(20),
    @PlatformFeePercent DECIMAL(5,2) = 15.0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        ------------------------------------------------
        -- 1. Load ride and basic validation
        ------------------------------------------------
        DECLARE @PassengerId     UNIQUEIDENTIFIER;
        DECLARE @DriverId        UNIQUEIDENTIFIER;
        DECLARE @CurrentStatus   NVARCHAR(100);
        DECLARE @ExistingPayment UNIQUEIDENTIFIER;
        DECLARE @ExistingPaymentStatus NVARCHAR(100);
        DECLARE @PriceFinal      DECIMAL(12,2);

        SELECT
            @PassengerId     = r.PassengerUserId,
            @DriverId        = r.DriverUserId,
            @CurrentStatus   = r.Status,
            @ExistingPayment = r.Payment,
            @ExistingPaymentStatus = p.Status,
            @PriceFinal      = r.PriceFinal
        FROM dbo.Ride r
        LEFT JOIN dbo.Payment p ON r.Payment = p.PaymentId
        WHERE r.RideId = @RideId;

        IF @CurrentStatus IS NULL
        BEGIN
            RAISERROR('Ride with ID %d does not exist.', 16, 1, @RideId);
            RETURN;
        END;

        -- Must be completed to pay
        IF @CurrentStatus <> 'Completed'
        BEGIN
            RAISERROR(
                'Ride %d must be Completed before creating payment. Current status: %s',
                16, 1, @RideId, @CurrentStatus
            );
            RETURN;
        END;

        -- Only 1 valid payment per ride
        IF @ExistingPayment IS NOT NULL AND @ExistingPaymentStatus <> 'Failed'
        BEGIN
            RAISERROR('Ride %d already has a completed payment.', 16, 1, @RideId);
            RETURN;
        END;

        IF @PaymentMethod NOT IN ('CreditCard', 'Cash')
        BEGIN
            RAISERROR('PaymentMethod must be either CreditCard or Cash.', 16, 1);
            RETURN;
        END;

        IF @PlatformFeePercent < 0 OR @PlatformFeePercent > 100
        BEGIN
            RAISERROR('PlatformFeePercent must be between 0 and 100.', 16, 1);
            RETURN;
        END;

        IF @PriceFinal IS NULL OR @PriceFinal <= 0
        BEGIN
            RAISERROR(
                'PriceFinal is not set or is invalid for RideId %d. Finalize the ride first.',
                16, 1, @RideId
            );
            RETURN;
        END;

        ------------------------------------------------
        -- 2. Payment breakdown
        ------------------------------------------------
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

        ------------------------------------------------
        -- 3. Insert Payment row
        ------------------------------------------------
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
            SYSUTCDATETIME(),
            @PaymentMethod,
            'Completed'  -- later you can move to 'Pending' if you integrate a PSP
        );

        ------------------------------------------------
        -- 4. Link payment to ride
        ------------------------------------------------
        UPDATE dbo.Ride
        SET Payment = @PaymentId
        WHERE RideId = @RideId;

        COMMIT TRANSACTION;

        ------------------------------------------------
        -- 5. Return summary
        ------------------------------------------------
        SELECT
            'SUCCESS'       AS Result,
            @RideId         AS RideId,
            @PaymentId      AS PaymentId,
            @PriceFinal     AS FinalPrice,
            @GrossAmount    AS GrossAmount,
            @OsrhFee        AS PlatformFee,
            @DriverPayout   AS DriverPayout,
            @PaymentMethod  AS PaymentMethod,
            'Payment created successfully.' AS Message;

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
