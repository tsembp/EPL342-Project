CREATE OR ALTER TRIGGER [dbo].[trg_DispatchOffer_AcceptTracking]
ON [dbo].[DispatchOffer]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Only trigger on status change to 'Accepted'
    IF NOT EXISTS (
        SELECT 1 FROM inserted i
        INNER JOIN deleted d ON i.OfferId = d.OfferId
        WHERE i.Status = 'Accepted' AND d.Status <> 'Accepted'
    )
        RETURN;

    -- Get affected ride requests
    DECLARE @RequestId INT;
    DECLARE @TotalLegs INT;
    DECLARE @AcceptedLegs INT;

    DECLARE request_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT DISTINCT il.RideRequestId
        FROM inserted i
        INNER JOIN [dbo].[ItineraryLeg] il ON i.LegId = il.LegId
        WHERE i.Status = 'Accepted';

    OPEN request_cursor;
    FETCH NEXT FROM request_cursor INTO @RequestId;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Count total legs and accepted offers for this request
        SELECT 
            @TotalLegs = COUNT(DISTINCT il.LegId),
            @AcceptedLegs = COUNT(DISTINCT CASE WHEN do_offer.Status = 'Accepted' THEN il.LegId END)
        FROM [dbo].[ItineraryLeg] il
        LEFT JOIN [dbo].[DispatchOffer] do_offer ON il.LegId = do_offer.LegId
        WHERE il.RideRequestId = @RequestId;

        -- Update or insert progress
        IF EXISTS (SELECT 1 FROM [dbo].[RideRequestProgress] WHERE RequestId = @RequestId)
        BEGIN
            UPDATE [dbo].[RideRequestProgress]
            SET 
                AcceptedLegs = @AcceptedLegs,
                Status = CASE 
                    WHEN @AcceptedLegs = @TotalLegs THEN 'AllAccepted'
                    ELSE 'AwaitingDrivers'
                END,
                UpdatedAt = GETUTCDATE()
            WHERE RequestId = @RequestId;
        END
        ELSE
        BEGIN
            INSERT INTO [dbo].[RideRequestProgress] (RequestId, TotalLegs, AcceptedLegs, Status)
            VALUES (@RequestId, @TotalLegs, @AcceptedLegs, 
                CASE WHEN @AcceptedLegs = @TotalLegs THEN 'AllAccepted' ELSE 'AwaitingDrivers' END);
        END;

        -- If all legs are accepted, automatically create rides
        IF @AcceptedLegs = @TotalLegs
        BEGIN
            EXEC [dbo].[usp_CreateRidesForCompletedRequest] @RequestId;
        END;

        FETCH NEXT FROM request_cursor INTO @RequestId;
    END;

    CLOSE request_cursor;
    DEALLOCATE request_cursor;
END;
GO