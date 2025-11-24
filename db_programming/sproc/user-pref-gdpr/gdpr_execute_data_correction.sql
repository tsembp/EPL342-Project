CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_ExecuteDataCorrection
(
    @UserId       UNIQUEIDENTIFIER,
    @GdprId       INT,
    @ActorAdminId UNIQUEIDENTIFIER = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
    VALUES (
        @GdprId,
        @ActorAdminId,
        GETUTCDATE(),
        'Marked GDPR DataCorrection as executed for user ' 
        + CONVERT(NVARCHAR(36), @UserId)
    );
END;
GO
