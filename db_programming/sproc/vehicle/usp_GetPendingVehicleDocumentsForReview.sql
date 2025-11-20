CREATE OR ALTER PROCEDURE dbo.usp_GetPendingVehicleDocumentsForReview
(
    @OperatorId UNIQUEIDENTIFIER
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate operator (must exist and be verified)
    IF NOT EXISTS (
        SELECT 1
        FROM [dbo].[Operator] O
        WHERE O.OperatorId = @OperatorId
          AND O.Verified = 1
    )
    BEGIN
        RAISERROR('Invalid or unverified operator.', 16, 1);
        RETURN;
    END;

    -- Return all pending vehicle documents
    SELECT
        VD.VehDocId,
        VD.VehicleId,
        V.PlateNumber,
        V.OwnerUserId,
        VD.DocType,
        VD.FileUrl,
        VD.IssueDate,
        VD.ExpiryDate,
        VD.UploadedAt,
        VD.Status
    FROM [dbo].[VehicleDocument] VD
    INNER JOIN [dbo].[Vehicle] V
        ON V.VehicleId = VD.VehicleId
    WHERE VD.Status = 'Pending'
    ORDER BY VD.UploadedAt;
END;
GO
