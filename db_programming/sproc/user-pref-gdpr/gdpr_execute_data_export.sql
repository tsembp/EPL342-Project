CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_ExecuteDataExport
(
    @UserId       UNIQUEIDENTIFIER,
    @GdprId       INT,
    @ActorAdminId UNIQUEIDENTIFIER = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    -- TODO: build/export data snapshot if you want

    INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
    VALUES (
        @GdprId,
        @ActorAdminId,
        GETUTCDATE(),
        'Executed GDPR DataExport for user ' + CONVERT(NVARCHAR(36), @UserId)
    );
END;
GO
