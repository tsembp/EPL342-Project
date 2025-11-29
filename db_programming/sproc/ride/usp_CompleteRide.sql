IF OBJECT_ID('dbo.usp_CompleteRide', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_CompleteRide;
GO

CREATE PROCEDURE dbo.usp_CompleteRide
    @RideId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        ------------------------------------------------
        -- 1. Load ride and basic validation
        ------------------------------------------------
        DECLARE @CurrentStatus    NVARCHAR(100);
        DECLARE @StartedAt        DATETIME2(0);
        DECLARE @PassengerId      UNIQUEIDENTIFIER;
        DECLARE @DriverId         UNIQUEIDENTIFIER;
        DECLARE @ExistingPayment  UNIQUEIDENTIFIER;
        DECLARE @OfferId          INT;

        SELECT 
            @CurrentStatus   = r.Status,
            @StartedAt       = r.StartedAt,
            @PassengerId     = r.PassengerUserId,
            @DriverId        = r.DriverUserId,
            @ExistingPayment = r.Payment,
            @OfferId         = r.OfferId
        FROM dbo.Ride r
        WHERE r.RideId = @RideId;

        IF @CurrentStatus IS NULL
        BEGIN
            RAISERROR('Ride with ID %d does not exist.', 16, 1, @RideId);
            RETURN;
        END;

        IF @CurrentStatus = 'Completed'
        BEGIN
            RAISERROR('Ride %d is already completed.', 16, 1, @RideId);
            RETURN;
        END;

        -- Allow Scheduled or InProgress for simplicity
        IF @CurrentStatus NOT IN ('Scheduled', 'InProgress')
        BEGIN
            RAISERROR(
                'Ride must be in Scheduled or InProgress status to complete. Current status: %s',
                16, 1, @CurrentStatus
            );
            RETURN;
        END;

        IF @ExistingPayment IS NOT NULL
        BEGIN
            RAISERROR(
                'Ride %d already has a payment; please check data consistency before completing.',
                16, 1, @RideId
            );
            RETURN;
        END;

        ------------------------------------------------
        -- 2. Compute EndedAt and DurationMinutes
        ------------------------------------------------
        DECLARE @EndedAt DATETIME2(0) = SYSUTCDATETIME();
        DECLARE @DurationMinutes INT;

        IF @EndedAt <= @StartedAt
        BEGIN
            DECLARE @StartedAtStr NVARCHAR(50) = CONVERT(NVARCHAR(50), @StartedAt, 120);
            RAISERROR('EndedAt must be after StartedAt (%s).', 16, 1, @StartedAtStr);
            RETURN;
        END;

        SET @DurationMinutes = DATEDIFF(MINUTE, @StartedAt, @EndedAt);

        ------------------------------------------------
        -- 3. Compute DistanceKm from ItineraryLeg via ZonePoints
        ------------------------------------------------
        DECLARE @LegId INT;
        DECLARE @FromPointId INT;
        DECLARE @ToPointId   INT;
        DECLARE @DistanceKm  DECIMAL(10,2);

        SELECT @LegId = dof.LegId
        FROM dbo.DispatchOffer dof
        WHERE dof.OfferId = @OfferId;

        IF @LegId IS NULL
        BEGIN
            RAISERROR('Cannot resolve LegId for RideId %d (OfferId %d).', 16, 1, @RideId, @OfferId);
            RETURN;
        END;

        SELECT 
            @FromPointId = il.FromPointId,
            @ToPointId   = il.ToPointId
        FROM dbo.ItineraryLeg il
        WHERE il.LegId = @LegId;

        IF @FromPointId IS NULL OR @ToPointId IS NULL
        BEGIN
            RAISERROR('Missing FromPointId/ToPointId for LegId %d.', 16, 1, @LegId);
            RETURN;
        END;

        DECLARE @DistanceMeters FLOAT;

        SELECT 
            @DistanceMeters = zpFrom.Location.STDistance(zpTo.Location)
        FROM dbo.ZonePoint zpFrom
        CROSS JOIN dbo.ZonePoint zpTo
        WHERE zpFrom.PointId = @FromPointId
          AND zpTo.PointId   = @ToPointId;

        IF @DistanceMeters IS NULL
        BEGIN
            RAISERROR(
                'Failed to compute distance for LegId %d (FromPointId=%d, ToPointId=%d).',
                16, 1, @LegId, @FromPointId, @ToPointId
            );
            RETURN;
        END;

        SET @DistanceKm = ROUND(@DistanceMeters / 1000.0, 2);

        ------------------------------------------------
        -- 4. Update ride metrics (time + distance)
        ------------------------------------------------
        UPDATE dbo.Ride
        SET 
            DistanceKm      = @DistanceKm,
            DurationMinutes = @DurationMinutes,
            EndedAt         = @EndedAt
        WHERE RideId = @RideId;

        ------------------------------------------------
        -- 5. Calculate and store PriceFinal
        ------------------------------------------------
        DECLARE @PriceFinal DECIMAL(12,2);

        SET @PriceFinal = dbo.ufn_CalculateRidePrice(@RideId);

        IF @PriceFinal IS NULL OR @PriceFinal <= 0
        BEGIN
            RAISERROR(
                'Failed to calculate ride price for RideId %d. Please check pricing configuration.',
                16, 1, @RideId
            );
            RETURN;
        END;

        UPDATE dbo.Ride
        SET 
            PriceFinal = @PriceFinal,
            Status     = 'Completed'
        WHERE RideId = @RideId;

        ------------------------------------------------
        -- 8. Multi-leg: if all rides for the request are Completed,
        --    mark RideRequest / Progress as Completed + aggregate totals
        ------------------------------------------------
        DECLARE @RequestId INT;

        SELECT @RequestId = il.RideRequestId
        FROM dbo.Ride r
        INNER JOIN dbo.DispatchOffer dof ON r.OfferId = dof.OfferId
        INNER JOIN dbo.ItineraryLeg il   ON dof.LegId = il.LegId
        WHERE r.RideId = @RideId;

        IF @RequestId IS NOT NULL
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM dbo.Ride r2
                INNER JOIN dbo.DispatchOffer dof2 ON r2.OfferId = dof2.OfferId
                INNER JOIN dbo.ItineraryLeg il2   ON dof2.LegId = il2.LegId
                WHERE il2.RideRequestId = @RequestId
                  AND r2.Status <> 'Completed'
            )
            BEGIN
                DECLARE @TotalDistanceKm       DECIMAL(10,2);
                DECLARE @TotalDurationMinutes  INT;
                DECLARE @TotalPrice            DECIMAL(12,2);

                SELECT 
                    @TotalDistanceKm      = SUM(ISNULL(r2.DistanceKm, 0)),
                    @TotalDurationMinutes = SUM(ISNULL(r2.DurationMinutes, 0)),
                    @TotalPrice           = SUM(ISNULL(r2.PriceFinal, 0))
                FROM dbo.Ride r2
                INNER JOIN dbo.DispatchOffer dof2 ON r2.OfferId = dof2.OfferId
                INNER JOIN dbo.ItineraryLeg il2   ON dof2.LegId = il2.LegId
                WHERE il2.RideRequestId = @RequestId;

                UPDATE dbo.RideRequest
                SET 
                    Status    = 'Completed',
                    UpdatedAt = SYSUTCDATETIME()
                WHERE RequestId = @RequestId;

                UPDATE dbo.RideRequestProgress
                SET 
                    Status    = 'Completed',
                    UpdatedAt = SYSUTCDATETIME()
                WHERE RequestId = @RequestId;
            END
        END;

        ------------------------------------------------
        -- 9. Commit & return
        ------------------------------------------------
        COMMIT TRANSACTION;

        SELECT 
            'SUCCESS'          AS Result,
            @RideId            AS RideId,
            @RequestId         AS RideRequestId,
            @DistanceKm        AS DistanceKm,
            @DurationMinutes   AS DurationMinutes,
            @PriceFinal        AS FinalPrice,
            'Ride completed successfully.' AS Message;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT          = ERROR_SEVERITY();
        DECLARE @ErrorState INT             = ERROR_STATE();

        SELECT 
            'ERROR'        AS Result,
            @RideId        AS RideId,
            @ErrorMessage  AS ErrorMessage,
            @ErrorSeverity AS ErrorSeverity,
            @ErrorState    AS ErrorState;

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH;
END;
GO
