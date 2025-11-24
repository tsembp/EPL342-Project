CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_ExecuteDataAccess
(
    @UserId       UNIQUEIDENTIFIER,
    @GdprId       INT,
    @ActorAdminId UNIQUEIDENTIFIER = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    -- TODO: optionally return a snapshot of user data here

    INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
    VALUES (
        @GdprId,
        @ActorAdminId,
        GETUTCDATE(),  
        'Executed GDPR DataAccess for user ' + CONVERT(NVARCHAR(36), @UserId)
    );
END;
GO
