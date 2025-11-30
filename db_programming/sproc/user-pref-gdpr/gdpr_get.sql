CREATE OR ALTER PROCEDURE dbo.usp_GetUserGdprRequests
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        G.GdprId,
        G.[Type],
        G.[Status],
        G.RequestedAt,
        G.[Reason]
    FROM dbo.GdprRequest AS G
    WHERE G.UserId = @UserId
    ORDER BY 
        G.RequestedAt DESC,
        G.GdprId DESC;
END;
