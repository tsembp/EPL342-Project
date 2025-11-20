-- =====================================================================
-- Check User/Driver Document Verification Integrity
-- =====================================================================
-- This script checks if verified users (particularly drivers) have any
-- documents that are not accepted. Verified users should only have
-- accepted documents.
-- =====================================================================

-- 1. Find verified users with non-accepted documents
SELECT 
    u.UserId,
    u.Username,
    u.FirstName + ' ' + u.LastName AS FullName,
    u.Role,
    u.Verified AS UserVerified,
    COUNT(pd.DocId) AS TotalDocuments,
    SUM(CASE WHEN pd.Status = 'Pending' THEN 1 ELSE 0 END) AS PendingDocs,
    SUM(CASE WHEN pd.Status = 'Rejected' THEN 1 ELSE 0 END) AS RejectedDocs,
    SUM(CASE WHEN pd.Status = 'Accepted' THEN 1 ELSE 0 END) AS AcceptedDocs
FROM 
    [dbo].[User] u
LEFT JOIN 
    [dbo].[PersonDocument] pd ON u.UserId = pd.UserId
WHERE 
    u.Verified = 1  -- Only verified users
GROUP BY 
    u.UserId, u.Username, u.FirstName, u.LastName, u.Role, u.Verified
HAVING 
    -- Has pending or rejected documents
    SUM(CASE WHEN pd.Status = 'Pending' THEN 1 ELSE 0 END) > 0
    OR SUM(CASE WHEN pd.Status = 'Rejected' THEN 1 ELSE 0 END) > 0
ORDER BY 
    u.Role, u.Username;

PRINT '-----------------------------------------------------------';

-- 2. Detailed view: Show each problematic document for verified users
SELECT 
    u.UserId,
    u.Username,
    u.FirstName + ' ' + u.LastName AS FullName,
    u.Role,
    u.Verified AS UserVerified,
    pd.DocId,
    pd.DocType,
    pd.Status AS DocumentStatus,
    pd.DocNo,
    pd.IssueDate,
    pd.ExpiryDate
FROM 
    [dbo].[User] u
INNER JOIN 
    [dbo].[PersonDocument] pd ON u.UserId = pd.UserId
WHERE 
    u.Verified = 1  -- Only verified users
    AND pd.Status != 'Accepted'  -- Documents that are not accepted
ORDER BY 
    u.Role, u.Username, pd.DocType;

PRINT '-----------------------------------------------------------';

-- 3. Focus on DRIVERS only
SELECT 
    u.UserId,
    u.Username,
    u.FirstName + ' ' + u.LastName AS FullName,
    u.Verified AS DriverVerified,
    COUNT(pd.DocId) AS TotalDocuments,
    SUM(CASE WHEN pd.Status = 'Pending' THEN 1 ELSE 0 END) AS PendingDocs,
    SUM(CASE WHEN pd.Status = 'Rejected' THEN 1 ELSE 0 END) AS RejectedDocs,
    SUM(CASE WHEN pd.Status = 'Accepted' THEN 1 ELSE 0 END) AS AcceptedDocs
FROM 
    [dbo].[User] u
INNER JOIN
    [dbo].[Driver] d ON u.UserId = d.UserId
LEFT JOIN 
    [dbo].[PersonDocument] pd ON u.UserId = pd.UserId
WHERE 
    u.Verified = 1  -- Only verified drivers
GROUP BY 
    u.UserId, u.Username, u.FirstName, u.LastName, u.Verified
HAVING 
    -- Has pending or rejected documents
    SUM(CASE WHEN pd.Status = 'Pending' THEN 1 ELSE 0 END) > 0
    OR SUM(CASE WHEN pd.Status = 'Rejected' THEN 1 ELSE 0 END) > 0
ORDER BY 
    u.Username;

PRINT '-----------------------------------------------------------';

-- 4. Summary statistics
SELECT 
    'Total Verified Users' AS Metric,
    COUNT(*) AS Count
FROM 
    [dbo].[User]
WHERE 
    Verified = 1

UNION ALL

SELECT 
    'Total Verified Drivers' AS Metric,
    COUNT(*) AS Count
FROM 
    [dbo].[User] u
INNER JOIN [dbo].[Driver] d ON u.UserId = d.UserId
WHERE 
    u.Verified = 1

UNION ALL

SELECT 
    'Verified Users with Non-Accepted Documents' AS Metric,
    COUNT(DISTINCT u.UserId) AS Count
FROM 
    [dbo].[User] u
INNER JOIN 
    [dbo].[PersonDocument] pd ON u.UserId = pd.UserId
WHERE 
    u.Verified = 1
    AND pd.Status != 'Accepted'

UNION ALL

SELECT 
    'Verified Drivers with Non-Accepted Documents' AS Metric,
    COUNT(DISTINCT u.UserId) AS Count
FROM 
    [dbo].[User] u
INNER JOIN [dbo].[Driver] d ON u.UserId = d.UserId
INNER JOIN 
    [dbo].[PersonDocument] pd ON u.UserId = pd.UserId
WHERE 
    u.Verified = 1
    AND pd.Status != 'Accepted'

UNION ALL

SELECT 
    'Total Non-Accepted Documents on Verified Users' AS Metric,
    COUNT(pd.DocId) AS Count
FROM 
    [dbo].[User] u
INNER JOIN 
    [dbo].[PersonDocument] pd ON u.UserId = pd.UserId
WHERE 
    u.Verified = 1
    AND pd.Status != 'Accepted';

PRINT '-----------------------------------------------------------';

-- 5. Check if verified drivers have required document types accepted
-- (Assuming drivers should have DRIVING_LICENSE and ID_OR_PASSPORT)
SELECT 
    u.UserId,
    u.Username,
    u.FirstName + ' ' + u.LastName AS FullName,
    u.Verified,
    CASE WHEN EXISTS (
        SELECT 1 FROM [dbo].[PersonDocument] pd 
        WHERE pd.UserId = u.UserId 
        AND pd.DocType = 'ID_OR_PASSPORT' 
        AND pd.Status = 'Accepted'
    ) THEN 'Yes' ELSE 'No' END AS HasAcceptedID,
    CASE WHEN EXISTS (
        SELECT 1 FROM [dbo].[PersonDocument] pd 
        WHERE pd.UserId = u.UserId 
        AND pd.DocType = 'DRIVING_LICENSE' 
        AND pd.Status = 'Accepted'
    ) THEN 'Yes' ELSE 'No' END AS HasAcceptedLicense,
    COUNT(pd.DocId) AS TotalDocs
FROM 
    [dbo].[User] u
INNER JOIN
    [dbo].[Driver] d ON u.UserId = d.UserId
LEFT JOIN 
    [dbo].[PersonDocument] pd ON u.UserId = pd.UserId
WHERE 
    u.Verified = 1
GROUP BY 
    u.UserId, u.Username, u.FirstName, u.LastName, u.Verified
HAVING 
    -- Missing required accepted documents
    NOT EXISTS (
        SELECT 1 FROM [dbo].[PersonDocument] pd2 
        WHERE pd2.UserId = u.UserId 
        AND pd2.DocType = 'ID_OR_PASSPORT' 
        AND pd2.Status = 'Accepted'
    )
    OR NOT EXISTS (
        SELECT 1 FROM [dbo].[PersonDocument] pd3 
        WHERE pd3.UserId = u.UserId 
        AND pd3.DocType = 'DRIVING_LICENSE' 
        AND pd3.Status = 'Accepted'
    )
ORDER BY 
    u.Username;
