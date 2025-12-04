CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_GetPendingRequests
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        gr.GdprId,
        gr.UserId,
        u.Username,
        u.Email,
        gr.Type,
        gr.RequestedAt,
        gr.Status,
        gr.Reason
    FROM dbo.GdprRequest gr
    INNER JOIN dbo.[User] u ON gr.UserId = u.UserId
    WHERE gr.Status = 'Pending'
    ORDER BY gr.RequestedAt DESC;
END