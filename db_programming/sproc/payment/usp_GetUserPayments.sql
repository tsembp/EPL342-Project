-- =============================================
-- Stored Procedure: usp_GetUserPayments
-- Description: Retrieve payment history for a user
-- Parameters:
--   @UserId: User ID to get payments for
--   @FromDate: Start date filter (optional)
--   @ToDate: End date filter (optional)
--   @Role: 'Sender', 'Receiver', or 'Both' (default 'Both')
-- Returns: Payment records with ride and user details
-- =============================================
IF OBJECT_ID('dbo.usp_GetUserPayments', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_GetUserPayments;
GO

CREATE PROCEDURE dbo.usp_GetUserPayments
    @UserId UNIQUEIDENTIFIER,
    @FromDate DATETIME2(0) = NULL,
    @ToDate DATETIME2(0) = NULL,
    @Role NVARCHAR(20) = 'Both'
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- Validate user exists
        IF NOT EXISTS (SELECT 1 FROM dbo.[User] WHERE UserId = @UserId)
        BEGIN
            RAISERROR('User with ID does not exist.', 16, 1);
            RETURN;
        END

        -- Validate role parameter
        IF @Role NOT IN ('Sender', 'Receiver', 'Both')
        BEGIN
            RAISERROR('Role must be Sender, Receiver, or Both.', 16, 1);
            RETURN;
        END

        -- Set default date range if not provided (last 6 months)
        IF @FromDate IS NULL
            SET @FromDate = DATEADD(MONTH, -6, GETUTCDATE());
        
        IF @ToDate IS NULL
            SET @ToDate = GETUTCDATE();

        -- Validate date range
        IF @ToDate < @FromDate
        BEGIN
            RAISERROR('ToDate must be after FromDate.', 16, 1);
            RETURN;
        END

        -- Retrieve payments based on role filter
        SELECT 
            p.PaymentId,
            p.GrossAmount,
            p.OsrhFee,
            p.DriverPayout,
            p.PaidAt,
            p.Method,
            p.Status,
            
            -- User role in this payment
            CASE 
                WHEN p.SenderUserId = @UserId THEN 'Sender'
                WHEN p.ReceiverUserId = @UserId THEN 'Receiver'
                ELSE 'Unknown'
            END AS UserRole,
            
            -- Sender details
            sender.UserId AS SenderUserId,
            sender.FirstName AS SenderFirstName,
            sender.LastName AS SenderLastName,
            sender.Username AS SenderUsername,
            
            -- Receiver details
            receiver.UserId AS ReceiverUserId,
            receiver.FirstName AS ReceiverFirstName,
            receiver.LastName AS ReceiverLastName,
            receiver.Username AS ReceiverUsername,
            
            -- Related ride details
            r.RideId,
            r.StartedAt AS RideStartedAt,
            r.EndedAt AS RideEndedAt,
            r.DistanceKm,
            r.DurationMinutes,
            r.Status AS RideStatus,
            
            -- Pickup/Dropoff zone info
            pickup_zone.Name AS PickupZoneName,
            dropoff_zone.Name AS DropoffZoneName,
            
            -- Service type info
            st.Name AS ServiceTypeName,
            rt.Name AS RideTypeName

        FROM dbo.Payment p
        INNER JOIN dbo.[User] sender ON p.SenderUserId = sender.UserId
        INNER JOIN dbo.[User] receiver ON p.ReceiverUserId = receiver.UserId
        LEFT JOIN dbo.[Ride] r ON p.PaymentId = r.Payment
        LEFT JOIN dbo.DispatchOffer do_offer ON r.OfferId = do_offer.OfferId
        LEFT JOIN dbo.ItineraryLeg il ON do_offer.LegId = il.LegId
        LEFT JOIN dbo.RideRequest rr ON il.RideRequestId = rr.RequestId
        LEFT JOIN dbo.AllowedRideProfile arp ON rr.RideProfileId = arp.RideProfileId
        LEFT JOIN dbo.Servicetype st ON arp.ServiceTypeId = st.ServiceTypeId
        LEFT JOIN dbo.Ridetype rt ON arp.RideTypeId = rt.RideTypeId
        LEFT JOIN dbo.ZonePoint pickup_point ON rr.PickUpPoint = pickup_point.PointId
        LEFT JOIN dbo.Geofencezone pickup_zone ON pickup_point.ZoneId = pickup_zone.ZoneId
        LEFT JOIN dbo.ZonePoint dropoff_point ON rr.DropOffPoint = dropoff_point.PointId
        LEFT JOIN dbo.Geofencezone dropoff_zone ON dropoff_point.ZoneId = dropoff_zone.ZoneId

        WHERE 
            (
                (@Role = 'Both' AND (p.SenderUserId = @UserId OR p.ReceiverUserId = @UserId))
                OR (@Role = 'Sender' AND p.SenderUserId = @UserId)
                OR (@Role = 'Receiver' AND p.ReceiverUserId = @UserId)
            )
            AND p.PaidAt >= @FromDate
            AND p.PaidAt <= @ToDate

        ORDER BY p.PaidAt DESC;

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO

PRINT 'Stored Procedure usp_GetUserPayments created successfully.';
GO
