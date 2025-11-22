-- =============================================
-- Stored Procedure: usp_CompleteRide
-- Description: Complete a ride and create payment transaction
-- Parameters:
--   @RideId: The ride to complete
--   @EndedAt: End timestamp
--   @DistanceKm: Total distance traveled
--   @DurationMinutes: Total duration
--   @PaymentMethod: 'CreditCard' or 'Cash'
--   @PlatformFeePercent: Platform fee percentage (default 15%)
-- Returns: Success/Error message
-- =============================================
IF OBJECT_ID('dbo.usp_CompleteRide', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CompleteRide;
GO

CREATE PROCEDURE dbo.usp_CompleteRide
    @RideId INT,
    @EndedAt DATETIME2(0),
    @DistanceKm DECIMAL(10,2),
    @DurationMinutes INT,
    @PaymentMethod NVARCHAR(20),
    @PlatformFeePercent DECIMAL(5,2) = 15.0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validation variables
        DECLARE @CurrentStatus NVARCHAR(100);
        DECLARE @StartedAt DATETIME2(0);
        DECLARE @PassengerId UNIQUEIDENTIFIER;
        DECLARE @DriverId UNIQUEIDENTIFIER;
        
        -- Payment calculation variables
        DECLARE @PriceFinal DECIMAL(12,2);
        DECLARE @GrossAmount DECIMAL(10,2);
        DECLARE @OsrhFee DECIMAL(10,2);
        DECLARE @DriverPayout DECIMAL(10,2);
        DECLARE @PaymentId UNIQUEIDENTIFIER;

        -- === STEP 1: Validate Ride Exists and Status ===
        SELECT 
            @CurrentStatus = Status,
            @StartedAt = StartedAt,
            @PassengerId = PassengerUserId,
            @DriverId = DriverUserId
        FROM dbo.[Ride]
        WHERE RideId = @RideId;

        IF @CurrentStatus IS NULL
        BEGIN
            RAISERROR('Ride with ID %d does not exist.', 16, 1, @RideId);
            RETURN;
        END

        -- Must be InProgress to complete
        IF @CurrentStatus <> 'InProgress'
        BEGIN
            RAISERROR('Ride must be in InProgress status to complete. Current status: %s', 16, 1, @CurrentStatus);
            RETURN;
        END

        -- === STEP 2: Validate Input Parameters ===
        IF @EndedAt <= @StartedAt
        BEGIN
            DECLARE @StartedAtStr NVARCHAR(50) = CONVERT(NVARCHAR(50), @StartedAt, 120);
            RAISERROR('EndedAt must be after StartedAt (%s).', 16, 1, @StartedAtStr);
            RETURN;
        END

        IF @DistanceKm < 0
        BEGIN
            RAISERROR('DistanceKm cannot be negative.', 16, 1);
            RETURN;
        END

        IF @DurationMinutes < 0
        BEGIN
            RAISERROR('DurationMinutes cannot be negative.', 16, 1);
            RETURN;
        END

        IF @PaymentMethod NOT IN ('CreditCard', 'Cash')
        BEGIN
            RAISERROR('PaymentMethod must be either CreditCard or Cash.', 16, 1);
            RETURN;
        END

        IF @PlatformFeePercent < 0 OR @PlatformFeePercent > 100
        BEGIN
            RAISERROR('PlatformFeePercent must be between 0 and 100.', 16, 1);
            RETURN;
        END

        -- === STEP 3: Update Ride with Distance and Duration ===
        UPDATE dbo.[Ride]
        SET 
            DistanceKm = @DistanceKm,
            DurationMinutes = @DurationMinutes,
            EndedAt = @EndedAt
        WHERE RideId = @RideId;

        -- === STEP 4: Calculate Dynamic Price ===
        SET @PriceFinal = dbo.ufn_CalculateRidePrice(@RideId);

        IF @PriceFinal = 0 OR @PriceFinal IS NULL
        BEGIN
            RAISERROR('Failed to calculate ride price. Please check ServiceType pricing configuration.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- === STEP 5: Calculate Payment Breakdown ===
        SET @GrossAmount = @PriceFinal;
        SET @OsrhFee = ROUND(@GrossAmount * (@PlatformFeePercent / 100.0), 2);
        SET @DriverPayout = @GrossAmount - @OsrhFee;

        -- Ensure driver payout is non-negative
        IF @DriverPayout < 0
            SET @DriverPayout = 0;

        -- === STEP 6: Create Payment Record ===
        SET @PaymentId = NEWID();

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
            @PassengerId,      -- Passenger pays
            @DriverId,         -- Driver receives
            @GrossAmount,
            @OsrhFee,
            @DriverPayout,
            GETUTCDATE(),
            @PaymentMethod,
            'Completed'        -- Payment completed immediately
        );

        -- === STEP 7: Update Ride with Final Price, Payment, and Status ===
        UPDATE dbo.[Ride]
        SET 
            PriceFinal = @PriceFinal,
            Payment = @PaymentId,
            Status = 'Completed'
        WHERE RideId = @RideId;

        COMMIT TRANSACTION;

        -- Return success message with details
        SELECT 
            'SUCCESS' AS Result,
            @RideId AS RideId,
            @PriceFinal AS FinalPrice,
            @GrossAmount AS GrossAmount,
            @OsrhFee AS PlatformFee,
            @DriverPayout AS DriverPayout,
            @PaymentId AS PaymentId,
            @PaymentMethod AS PaymentMethod,
            'Ride completed successfully.' AS Message;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        -- Return error details
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        SELECT 
            'ERROR' AS Result,
            @RideId AS RideId,
            @ErrorMessage AS ErrorMessage,
            @ErrorSeverity AS ErrorSeverity,
            @ErrorState AS ErrorState;

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO

PRINT 'Stored Procedure usp_CompleteRide created successfully.';
GO
