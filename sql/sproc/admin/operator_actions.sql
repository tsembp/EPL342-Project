-- Approve operator
CREATE OR ALTER PROCEDURE dbo.usp_Admin_ApproveOperator
    @OperatorId UNIQUEIDENTIFIER,
    @AdminId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRANSACTION

    IF NOT EXISTS (SELECT 1 FROM Operator WHERE OperatorId = @OperatorId)
    BEGIN
        ROLLBACK TRANSACTION;
        ;THROW 50001, 'Operator not found.', 1;
    END

    UPDATE Operator
    SET Verified = 1, CheckedAt = GETUTCDATE(), CheckedByAdmin = @AdminId
    WHERE OperatorId = @OperatorId;

    IF @@ROWCOUNT = 0
    BEGIN
        ROLLBACK TRANSACTION;
        ;THROW 50002, 'Failed to approve operator.', 1;
    END

    COMMIT TRANSACTION
END

GO

-- Reject Operator
CREATE OR ALTER PROCEDURE dbo.usp_Admin_RejectOperator
    @OperatorId UNIQUEIDENTIFIER,
    @AdminId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRANSACTION

    IF NOT EXISTS (SELECT 1 FROM Operator WHERE OperatorId = @OperatorId)
    BEGIN
        ROLLBACK TRANSACTION;
        ;THROW 50001, 'Operator not found.', 1;
    END

    UPDATE Operator
    SET Verified = 0, CheckedAt = GETUTCDATE(), CheckedByAdmin = @AdminId
    WHERE OperatorId = @OperatorId;

    IF @@ROWCOUNT = 0
    BEGIN
        ROLLBACK TRANSACTION;
        ;THROW 50002, 'Failed to approve operator.', 1;
    END

    COMMIT TRANSACTION
END