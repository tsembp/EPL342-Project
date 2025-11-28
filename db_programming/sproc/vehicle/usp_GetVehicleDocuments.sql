CREATE OR ALTER PROCEDURE dbo.usp_GetPendingVehicleDocumentsForReview
(
    @OperatorId UNIQUEIDENTIFIER
)
AS
BEGIN
    EXEC dbo.usp_GetVehicleDocumentsByStatus
        @OperatorId = @OperatorId,
        @Status     = 'Pending';
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_GetAcceptedVehicleDocuments
(
    @OperatorId UNIQUEIDENTIFIER
)
AS
BEGIN
    EXEC dbo.usp_GetVehicleDocumentsByStatus
        @OperatorId = @OperatorId,
        @Status     = 'Accepted';
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_GetRejectedVehicleDocuments
(
    @OperatorId UNIQUEIDENTIFIER
)
AS
BEGIN
    EXEC dbo.usp_GetVehicleDocumentsByStatus
        @OperatorId = @OperatorId,
        @Status     = 'Rejected';
END;
GO
