-- =====================================================================
-- Check Vehicle Document Verification Integrity
-- =====================================================================
-- This script checks if verified vehicles have any unverified documents
-- Verified vehicles should only have accepted documents
-- =====================================================================

-- 1. Find verified vehicles with pending or rejected documents
SELECT 
    v.VehicleId,
    v.PlateNumber,
    v.Brand,
    v.Model,
    v.Verified AS VehicleVerified,
    v.Status AS VehicleStatus,
    COUNT(vd.VehDocId) AS TotalDocuments,
    SUM(CASE WHEN vd.Status = 'Pending' THEN 1 ELSE 0 END) AS PendingDocs,
    SUM(CASE WHEN vd.Status = 'Rejected' THEN 1 ELSE 0 END) AS RejectedDocs,
    SUM(CASE WHEN vd.Status = 'Accepted' THEN 1 ELSE 0 END) AS AcceptedDocs,
    SUM(CASE WHEN vd.Accepted = 0 THEN 1 ELSE 0 END) AS UnacceptedDocs
FROM 
    [dbo].[Vehicle] v
LEFT JOIN 
    [dbo].[VehicleDocument] vd ON v.VehicleId = vd.VehicleId
WHERE 
    v.Verified = 1  -- Only verified vehicles
GROUP BY 
    v.VehicleId, v.PlateNumber, v.Brand, v.Model, v.Verified, v.Status
HAVING 
    -- Has pending or rejected documents, or has unaccepted documents
    SUM(CASE WHEN vd.Status = 'Pending' THEN 1 ELSE 0 END) > 0
    OR SUM(CASE WHEN vd.Status = 'Rejected' THEN 1 ELSE 0 END) > 0
    OR SUM(CASE WHEN vd.Accepted = 0 THEN 1 ELSE 0 END) > 0
ORDER BY 
    v.PlateNumber;

PRINT '-----------------------------------------------------------';

-- 2. Detailed view: Show each problematic document
SELECT 
    v.VehicleId,
    v.PlateNumber,
    v.Brand + ' ' + v.Model AS Vehicle,
    v.Verified AS VehicleVerified,
    vd.VehDocId,
    vd.DocType,
    vd.Status AS DocumentStatus,
    vd.Accepted AS DocumentAccepted,
    vd.ReviewedByOperatorId,
    vd.ReviewedAt,
    vd.ReviewComments
FROM 
    [dbo].[Vehicle] v
INNER JOIN 
    [dbo].[VehicleDocument] vd ON v.VehicleId = vd.VehicleId
WHERE 
    v.Verified = 1  -- Only verified vehicles
    AND (vd.Status != 'Accepted' OR vd.Accepted = 0)  -- Documents that are not accepted
ORDER BY 
    v.PlateNumber, vd.DocType;

PRINT '-----------------------------------------------------------';

-- 3. Summary statistics
SELECT 
    'Total Verified Vehicles' AS Metric,
    COUNT(*) AS Count
FROM 
    [dbo].[Vehicle]
WHERE 
    Verified = 1

UNION ALL

SELECT 
    'Verified Vehicles with Problematic Documents' AS Metric,
    COUNT(DISTINCT v.VehicleId) AS Count
FROM 
    [dbo].[Vehicle] v
INNER JOIN 
    [dbo].[VehicleDocument] vd ON v.VehicleId = vd.VehicleId
WHERE 
    v.Verified = 1
    AND (vd.Status != 'Accepted' OR vd.Accepted = 0)

UNION ALL

SELECT 
    'Total Problematic Documents on Verified Vehicles' AS Metric,
    COUNT(vd.VehDocId) AS Count
FROM 
    [dbo].[Vehicle] v
INNER JOIN 
    [dbo].[VehicleDocument] vd ON v.VehicleId = vd.VehicleId
WHERE 
    v.Verified = 1
    AND (vd.Status != 'Accepted' OR vd.Accepted = 0);

PRINT '-----------------------------------------------------------';

-- 4. Optional: Check if verified vehicles have all required document types
-- (Assuming vehicles should have at least VEHICLE_REGISTRATION and MOT_CERTIFICATE)
SELECT 
    v.VehicleId,
    v.PlateNumber,
    v.Brand + ' ' + v.Model AS Vehicle,
    v.Verified,
    CASE WHEN EXISTS (
        SELECT 1 FROM [dbo].[VehicleDocument] vd 
        WHERE vd.VehicleId = v.VehicleId 
        AND vd.DocType = 'VEHICLE_REGISTRATION' 
        AND vd.Status = 'Accepted'
    ) THEN 'Yes' ELSE 'No' END AS HasRegistration,
    CASE WHEN EXISTS (
        SELECT 1 FROM [dbo].[VehicleDocument] vd 
        WHERE vd.VehicleId = v.VehicleId 
        AND vd.DocType = 'MOT_CERTIFICATE' 
        AND vd.Status = 'Accepted'
    ) THEN 'Yes' ELSE 'No' END AS HasMOT,
    CASE WHEN EXISTS (
        SELECT 1 FROM [dbo].[VehicleDocument] vd 
        WHERE vd.VehicleId = v.VehicleId 
        AND vd.DocType = 'VEHICLE_CLASSIFICATION_CERTIFICATE' 
        AND vd.Status = 'Accepted'
    ) THEN 'Yes' ELSE 'No' END AS HasClassification,
    COUNT(vd.VehDocId) AS TotalDocs
FROM 
    [dbo].[Vehicle] v
LEFT JOIN 
    [dbo].[VehicleDocument] vd ON v.VehicleId = vd.VehicleId
WHERE 
    v.Verified = 1
GROUP BY 
    v.VehicleId, v.PlateNumber, v.Brand, v.Model, v.Verified
HAVING 
    -- Missing required documents or they are not accepted
    NOT EXISTS (
        SELECT 1 FROM [dbo].[VehicleDocument] vd2 
        WHERE vd2.VehicleId = v.VehicleId 
        AND vd2.DocType = 'VEHICLE_REGISTRATION' 
        AND vd2.Status = 'Accepted'
    )
    OR NOT EXISTS (
        SELECT 1 FROM [dbo].[VehicleDocument] vd3 
        WHERE vd3.VehicleId = v.VehicleId 
        AND vd3.DocType = 'MOT_CERTIFICATE' 
        AND vd3.Status = 'Accepted'
    )
ORDER BY 
    v.PlateNumber;
