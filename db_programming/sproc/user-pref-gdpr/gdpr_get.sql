CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_GetPendingRequests
(
    @TypeFilter NVARCHAR(100) = NULL  -- e.g. 'DataCorrection' or NULL for all
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        gr.GdprId,
        gr.UserId,
        u.Username,
        u.Email,
        gr.[Type],
        gr.RequestedAt,
        gr.[Status],
        gr.[Reason]
    FROM dbo.GdprRequest AS gr
    INNER JOIN dbo.[User] AS u ON gr.UserId = u.UserId
    WHERE gr.[Status] IN ('Pending','Under-Review')
      AND (@TypeFilter IS NULL OR gr.[Type] = @TypeFilter)
    ORDER BY gr.RequestedAt DESC;
END;
GO
