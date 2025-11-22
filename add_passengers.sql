-- ========================================
-- Add 3 Passenger Users to the Database
-- ========================================
-- This script uses the usp_SignUpUser stored procedure to create passenger accounts
-- Passengers are automatically verified upon creation (Verified=1)

-- Passenger 1: John Doe
EXEC dbo.usp_SignUpUser
    @Role = 'P',
    @FirstName = 'Spyros',
    @LastName = 'Gavriil',
    @Dob = '2004-06-19',
    @Gender = 'M',
    @Email = 'spyros@gmail.com',
    @Phone = '+357-99756967',
    @Address = '123 Ledra Street, Nicosia, Cyprus',
    @Username = 'spyrosgavriil',
    @PasswordPlain = '123456',
    @Company = NULL;
GO

-- Passenger 2: Maria Papadopoulos
EXEC dbo.usp_SignUpUser
    @Role = 'P',
    @FirstName = 'Panagiotis',
    @LastName = 'Tsembekis',
    @Dob = '2004-04-06',
    @Gender = 'M',
    @Email = 'tsembekis@gmail.com',
    @Phone = '+357-96234567',
    @Address = '45 Makarios Avenue, Limassol, Cyprus',
    @Username = 'panagiotistsempekis',
    @PasswordPlain = '123456',
    @Company = NULL;
GO

-- Passenger 3: Andreas Georgiou
EXEC dbo.usp_SignUpUser
    @Role = 'P',
    @FirstName = 'Andreas',
    @LastName = 'Evagorou',
    @Dob = '2004-11-15',
    @Gender = 'M',
    @Email = 'piratis@gmail.com',
    @Phone = '+357-97345678',
    @Address = '78 Kennedy Avenue, Nicosia, Cyprus',
    @Username = 'andreasG',
    @PasswordPlain = '123456',
    @Company = NULL;
GO

-- ========================================
-- Verify the passengers were created
-- ========================================
SELECT 
    U.UserId,
    U.FirstName,
    U.LastName,
    U.Email,
    U.Username,
    U.Phone,
    U.Address,
    U.Dob,
    U.Gender,
    U.Verified,
    U.CreatedAt
FROM dbo.[User] U
INNER JOIN dbo.Passenger P ON U.UserId = P.UserId
WHERE U.Email IN (
    'spyros@gmail.com',
    'tsembekis@gmail.com',
    'piratis@gmail.com'
)
ORDER BY U.CreatedAt DESC;
GO

-- ========================================
-- Test Login for Each User
-- ========================================
PRINT 'Testing login for Spyros Gavriil...';
EXEC dbo.usp_Login 
    @InputEmail = 'spyros@gmail.com',
    @PasswordPlain = '123456';
GO

PRINT 'Testing login for Panagiotis Tsembekis...';
EXEC dbo.usp_Login 
    @InputEmail = 'tsembekis@gmail.com',
    @PasswordPlain = '123456';
GO

PRINT 'Testing login for Andreas Evagorou...';
EXEC dbo.usp_Login 
    @InputEmail = 'piratis@gmail.com',
    @PasswordPlain = '123456';
GO
