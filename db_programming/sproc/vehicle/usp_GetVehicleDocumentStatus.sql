CREATE OR ALTER PROCEDURE dbo.usp_GetVehicleDocumentStatus
(
    @VehicleId UNIQUEIDENTIFIER
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        VD.VehDocId,
        VD.DocType,
        VD.IssueDate,
        VD.ExpiryDate,
        VD.Status,
        VD.Accepted,
        VD.ReviewComments,
        -- You might also want to include the actual file URL if it were stored dynamically
        VD.FileUrl
    FROM [dbo].[VehicleDocument] VD
    WHERE VD.VehicleId = @VehicleId
    ORDER BY VD.DocType, VD.UploadedAt DESC; -- Order to easily pick the latest status if multiple
END;
GO
