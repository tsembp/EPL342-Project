CREATE OR ALTER PROCEDURE dbo.usp_GetVehicleDocumentsByStatus
(
    @OperatorId UNIQUEIDENTIFIER,
    @Status     NVARCHAR(20) = NULL  -- 'Pending' | 'Accepted' | 'Rejected' | NULL = all
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

    -- Validate @Status if given
    IF @Status IS NOT NULL
       AND @Status NOT IN ('Pending','Accepted','Rejected')
    BEGIN
        RAISERROR('@Status must be Pending, Accepted or Rejected or NULL.', 16, 1);
        RETURN;
    END;

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
    WHERE (@Status IS NULL OR VD.Status = @Status)
    ORDER BY VD.UploadedAt;
END;
GO
