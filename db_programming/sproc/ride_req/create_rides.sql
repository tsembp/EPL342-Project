CREATE OR ALTER PROCEDURE [dbo].[usp_CreateRidesForCompletedRequest]
    @RequestId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        ------------------------------------------------
        -- 1. Validate that all legs have exactly one accepted offer
        ------------------------------------------------
        DECLARE @TotalLegs    INT;
        DECLARE @AcceptedLegs INT;

        SELECT 
            @TotalLegs = COUNT(DISTINCT il.LegId),
            @AcceptedLegs = COUNT(DISTINCT do_offer.LegId)
        FROM [dbo].[ItineraryLeg] il
        LEFT JOIN [dbo].[DispatchOffer] do_offer
            ON do_offer.LegId = il.LegId
           AND do_offer.Status = 'Accepted'
        WHERE il.RideRequestId = @RequestId;

        IF @TotalLegs IS NULL OR @TotalLegs = 0
        BEGIN
            RAISERROR('No itinerary legs found for RequestId %d', 16, 1, @RequestId);
            RETURN;
        END;

        IF @AcceptedLegs < @TotalLegs
        BEGIN
            -- Not all legs have accepted offers -> nothing to do
            RETURN;
        END;

        ------------------------------------------------
        -- 2. Validate progress state
        ------------------------------------------------
        DECLARE @ProgressStatus NVARCHAR(50);

        SELECT @ProgressStatus = Status
        FROM dbo.RideRequestProgress
        WHERE RequestId = @RequestId;

        IF @ProgressStatus <> 'AllAccepted'
        BEGIN
            RAISERROR(
                'Cannot create rides for RideRequest %d: RideRequestProgress not in AllAccepted state.',
                16, 1, @RequestId
            );
            RETURN;
        END;

        ------------------------------------------------
        -- 3. Avoid duplicate ride creation
        ------------------------------------------------
        IF EXISTS (
            SELECT 1
            FROM dbo.Ride r
            JOIN dbo.DispatchOffer dof ON r.OfferId = dof.OfferId
            JOIN dbo.ItineraryLeg il   ON dof.LegId = il.LegId
            WHERE il.RideRequestId = @RequestId
        )
        BEGIN
            -- Rides already created for this request
            RETURN;
        END;

        ------------------------------------------------
        -- 4. Create rides for all itinerary legs of this ride request
        ------------------------------------------------
        INSERT INTO dbo.Ride (
            OfferId,
            DriverUserId,
            PassengerUserId,
            VehicleId,
            StartedAt,
            EndedAt,
            DistanceKm,
            DurationMinutes,
            PriceFinal,
            [Status],
            Payment
        )
        SELECT
            dof.OfferId,
            dof.RecipientUserId     AS DriverUserId,
            rr.PassengerId          AS PassengerUserId,
            e.VehicleId             AS VehicleId,
            il.ApproxStartTime      AS StartedAt,
            il.ApproxEndTime        AS EndedAt,
            NULL                    AS DistanceKm,       -- filled later
            NULL                    AS DurationMinutes,  -- filled later
            0.00                    AS PriceFinal,       -- calc now or at the end?
            'Scheduled'             AS [Status],
            NULL                    AS Payment
        FROM dbo.ItineraryLeg il
        JOIN dbo.DispatchOffer dof
            ON dof.LegId = il.LegId
        AND dof.Status = 'Accepted'
        JOIN dbo.UserServiceEnrollment e
            ON e.EnrollId = dof.EnrollId
        JOIN dbo.RideRequest rr
            ON rr.RequestId = il.RideRequestId
        WHERE il.RideRequestId = @RequestId
          AND NOT EXISTS (
            SELECT 1
            FROM dbo.Ride r
            WHERE r.OfferId = dof.OfferId
          );

        ------------------------------------------------
        -- 5. Update progress & request statuses
        ------------------------------------------------
        UPDATE [dbo].[RideRequestProgress]
        SET 
            Status    = 'RidesCreated',
            UpdatedAt = SYSUTCDATETIME()
        WHERE RequestId = @RequestId;

        UPDATE [dbo].[RideRequest]
        SET 
            Status    = 'Accepted',
            UpdatedAt = SYSUTCDATETIME()
        WHERE RequestId = @RequestId;

        ------------------------------------------------
        -- 6. Return summary
        ------------------------------------------------
        SELECT 
            @RequestId AS RequestId,
            @TotalLegs AS TotalLegs,
            COUNT(*)   AS RidesCreated,
            'SUCCESS'  AS Result
        FROM dbo.Ride r
        JOIN dbo.DispatchOffer dof
            ON r.OfferId = dof.OfferId
        JOIN dbo.ItineraryLeg il
            ON dof.LegId = il.LegId
        WHERE il.RideRequestId = @RequestId;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT          = ERROR_SEVERITY();
        DECLARE @ErrorState INT             = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO
