CREATE OR ALTER PROCEDURE dbo.usp_RespondToDispatchOffer
(
    @OfferId       INT,
    @DriverUserId  UNIQUEIDENTIFIER,
    @Action        NVARCHAR(10)  -- 'Accept' or 'Reject'
)
AS
BEGIN
    SET NOCOUNT ON;

    IF @Action NOT IN ('Accept', 'Reject')
    BEGIN
        RAISERROR('Action must be ''Accept'' or ''Reject''.', 16, 1);
        RETURN;
    END;

    DECLARE @CurrentStatus NVARCHAR(20);
    DECLARE @RecipientId   UNIQUEIDENTIFIER;

    SELECT
        @CurrentStatus = DO.Status,
        @RecipientId   = DO.RecipientUserId
    FROM dbo.DispatchOffer DO
    WHERE DO.OfferId = @OfferId;

    IF @CurrentStatus IS NULL
    BEGIN
        RAISERROR('Offer not found.', 16, 1);
        RETURN;
    END;

    IF @RecipientId <> @DriverUserId
    BEGIN
        RAISERROR('Offer does not belong to this driver.', 16, 1);
        RETURN;
    END;

    -- Only allow responding if still "Sent"
    IF @CurrentStatus <> 'Sent'
    BEGIN
        RAISERROR('Offer has already been responded to.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.DispatchOffer
    SET 
        Status      = CASE WHEN @Action = 'Accept' THEN 'Accepted' ELSE 'Declined' END,
        RespondedAt = SYSUTCDATETIME()
    WHERE OfferId = @OfferId;

    -- Return the updated row
    SELECT 
        OfferId,
        Status,
        SentAt,
        RespondedAt,
        EnrollId,
        LegId,
        RecipientUserId
    FROM dbo.DispatchOffer
    WHERE OfferId = @OfferId;
END;
GO
