CREATE OR ALTER PROCEDURE dbo.usp_Gdpr_ExecuteDataDeletion
(
    @UserId       UNIQUEIDENTIFIER,
    @GdprId       INT,
    @ActorAdminId UNIQUEIDENTIFIER = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRAN;

        ------------------------------------------------
        -- Hook: implement your real right-to-be-forgotten
        -- logic inside this procedure.
        ------------------------------------------------
        EXEC dbo.usp_Gdpr_AnonymizeUser @UserId;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRAN;
        THROW;
    END CATCH;

    INSERT INTO dbo.GdprLog (GdprId, ActorAdminId, LoggedAt, Note)
    VALUES (
        @GdprId,
        @ActorAdminId,
        GETUTCDATE(),
        'Executed GDPR DataDeletion for user ' + CONVERT(NVARCHAR(36), @UserId)
    );
END;
GO
