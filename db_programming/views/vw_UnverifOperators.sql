CREATE OR ALTER VIEW dbo.vw_UnverifiedOperators
AS
SELECT
    o.OperatorId,
    o.Username,
    o.Email,
    o.CreatedAt
FROM dbo.Operator o
WHERE o.Verified = 0 AND CheckedAt IS NULL AND CheckedByAdmin IS NULL;