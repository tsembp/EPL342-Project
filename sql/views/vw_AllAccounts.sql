CREATE OR ALTER VIEW dbo.vw_AllAccounts AS
SELECT 
    U.UserId,
    U.Email,
    U.Username,
    U.PasswordHash,
    U.Role,        
    U.Verified,
    'USER' AS AccountType
FROM [dbo].[User] U 

UNION ALL

SELECT
    O.OperatorId AS UserId,
    O.Email,
    O.Username,
    O.PasswordHash,
    'O' AS Role,
    O.Verified AS Verified,
    'STAFF' AS AccountType
FROM [dbo].[Operator] O

UNION ALL

SELECT
    I.InspectorId AS UserId,
    I.Email,
    I.Username,
    I.PasswordHash,
    'I' AS Role,
    NULL AS Verified,
    'STAFF' AS AccountType
FROM [dbo].[Inspector] I;
