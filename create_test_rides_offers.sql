-- ============================================================================
-- Script to create test data for Driver and Company Representative rides/offers
-- ============================================================================

-- Users:
-- Driver: 97519A61-D423-440D-9CA1-A11C45F7A054 (spyros driver) - Vehicle: 7A8CAD06-8B2E-4B6A-A1E4-75050F846981 (Crossover)
-- Company Rep: 4170C7A2-56EC-4AE8-8EEB-6833F657C571 (spyros company) - Vehicle: C40DE647-8597-4B73-BC09-D18B6BB186BF (Convertible)
-- Passenger: 69281CD2-D513-4D79-B59C-D064A02FF96F (spyros)

DECLARE @DriverUserId UNIQUEIDENTIFIER = '97519A61-D423-440D-9CA1-A11C45F7A054';
DECLARE @CompanyRepUserId UNIQUEIDENTIFIER = '4170C7A2-56EC-4AE8-8EEB-6833F657C571';
DECLARE @PassengerId UNIQUEIDENTIFIER = '69281CD2-D513-4D79-B59C-D064A02FF96F';

DECLARE @DriverVehicleId UNIQUEIDENTIFIER = '7A8CAD06-8B2E-4B6A-A1E4-75050F846981';
DECLARE @CompanyRepVehicleId UNIQUEIDENTIFIER = 'C40DE647-8597-4B73-BC09-D18B6BB186BF';

-- ============================================================================
-- STEP 1: Create service enrollments for both users if they don't exist
-- ============================================================================

PRINT 'Creating/Verifying Service Enrollments...';

-- Driver enrollment (Crossover + simple_route + vehicle_with_driver)
-- VehicleTypeId for Crossover = 3, ServiceTypeId for simple_route = 5, RideTypeId for vehicle_with_driver = 5
IF NOT EXISTS (
    SELECT 1 FROM UserServiceEnrollment 
    WHERE UserId = @DriverUserId AND VehicleId = @DriverVehicleId AND ServiceType = 5 AND RideType = 5
)
BEGIN
    INSERT INTO UserServiceEnrollment (UserId, VehicleId, ServiceType, RideType, Status, CheckedById, ReviewedAt)
    VALUES (@DriverUserId, @DriverVehicleId, 5, 5, 'Approved', NULL, GETUTCDATE());
    PRINT '✓ Created driver enrollment for simple_route + vehicle_with_driver';
END
ELSE
BEGIN
    PRINT '✓ Driver enrollment already exists';
END

-- Company Rep enrollment (Convertible + simple_route + fully_autonomous)
-- VehicleTypeId for Convertible = 1, ServiceTypeId for simple_route = 5, RideTypeId for fully_autonomous = 1
IF NOT EXISTS (
    SELECT 1 FROM UserServiceEnrollment 
    WHERE UserId = @CompanyRepUserId AND VehicleId = @CompanyRepVehicleId AND ServiceType = 5 AND RideType = 1
)
BEGIN
    INSERT INTO UserServiceEnrollment (UserId, VehicleId, ServiceType, RideType, Status, CheckedById, ReviewedAt)
    VALUES (@CompanyRepUserId, @CompanyRepVehicleId, 5, 1, 'Approved', NULL, GETUTCDATE());
    PRINT '✓ Created company rep enrollment for simple_route + fully_autonomous';
END
ELSE
BEGIN
    PRINT '✓ Company rep enrollment already exists';
END

DECLARE @DriverEnrollId INT;
DECLARE @CompanyRepEnrollId INT;

SELECT @DriverEnrollId = EnrollId 
FROM UserServiceEnrollment 
WHERE UserId = @DriverUserId AND VehicleId = @DriverVehicleId AND ServiceType = 5 AND RideType = 5;

SELECT @CompanyRepEnrollId = EnrollId 
FROM UserServiceEnrollment 
WHERE UserId = @CompanyRepUserId AND VehicleId = @CompanyRepVehicleId AND ServiceType = 5 AND RideType = 1;

PRINT 'Driver EnrollId: ' + CAST(@DriverEnrollId AS NVARCHAR(10));
PRINT 'Company Rep EnrollId: ' + CAST(@CompanyRepEnrollId AS NVARCHAR(10));

-- ============================================================================
-- STEP 2: Get valid ride profile IDs
-- ============================================================================

DECLARE @DriverProfileId UNIQUEIDENTIFIER;
DECLARE @CompanyRepProfileId UNIQUEIDENTIFIER;

-- Driver profile: Crossover + simple_route + vehicle_with_driver
SELECT @DriverProfileId = RideProfileId
FROM AllowedRideProfile
WHERE VehicleTypeId = 3 AND ServiceTypeId = 5 AND RideTypeId = 5;

-- Company Rep profile: Convertible + simple_route + fully_autonomous
SELECT @CompanyRepProfileId = RideProfileId
FROM AllowedRideProfile
WHERE VehicleTypeId = 1 AND ServiceTypeId = 5 AND RideTypeId = 1;

PRINT 'Driver ProfileId: ' + CAST(@DriverProfileId AS NVARCHAR(50));
PRINT 'Company Rep ProfileId: ' + CAST(@CompanyRepProfileId AS NVARCHAR(50));

-- ============================================================================
-- STEP 3: Create ride requests for testing
-- ============================================================================

PRINT '';
PRINT 'Creating Ride Requests...';

DECLARE @RideRequest1 INT, @RideRequest2 INT, @RideRequest3 INT, @RideRequest4 INT;
DECLARE @Leg1_RR1 INT, @Leg1_RR2 INT, @Leg1_RR3 INT, @Leg1_RR4 INT;

-- Ride Request 1: For Driver (Scheduled - future)
INSERT INTO RideRequest (PassengerId, NumOfPeople, PickupAt, PickUpPoint, DropOffPoint, Status, RideProfileId, CreatedAt)
VALUES (@PassengerId, 2, DATEADD(HOUR, 2, GETUTCDATE()), 1, 5, 'Pending', @DriverProfileId, GETUTCDATE());
SET @RideRequest1 = SCOPE_IDENTITY();

-- Create leg for RideRequest 1
INSERT INTO ItineraryLeg (RideRequestId, SeqNo, ZoneId, FromPointId, ToPointId, ApproxStartTime, ApproxEndTime)
VALUES (@RideRequest1, 1, 1, 1, 5, DATEADD(HOUR, 2, GETUTCDATE()), DATEADD(HOUR, 2, DATEADD(MINUTE, 25, GETUTCDATE())));
SET @Leg1_RR1 = SCOPE_IDENTITY();

-- Ride Request 2: For Driver (Scheduled - near future for active offer)
INSERT INTO RideRequest (PassengerId, NumOfPeople, PickupAt, PickUpPoint, DropOffPoint, Status, RideProfileId, CreatedAt)
VALUES (@PassengerId, 1, DATEADD(HOUR, 4, GETUTCDATE()), 2, 6, 'Pending', @DriverProfileId, GETUTCDATE());
SET @RideRequest2 = SCOPE_IDENTITY();

INSERT INTO ItineraryLeg (RideRequestId, SeqNo, ZoneId, FromPointId, ToPointId, ApproxStartTime, ApproxEndTime)
VALUES (@RideRequest2, 1, 2, 2, 6, DATEADD(HOUR, 4, GETUTCDATE()), DATEADD(HOUR, 4, DATEADD(MINUTE, 18, GETUTCDATE())));
SET @Leg1_RR2 = SCOPE_IDENTITY();

-- Ride Request 3: For Company Rep (Scheduled)
INSERT INTO RideRequest (PassengerId, NumOfPeople, PickupAt, PickUpPoint, DropOffPoint, Status, RideProfileId, CreatedAt)
VALUES (@PassengerId, 3, DATEADD(HOUR, 3, GETUTCDATE()), 3, 7, 'Pending', @CompanyRepProfileId, GETUTCDATE());
SET @RideRequest3 = SCOPE_IDENTITY();

INSERT INTO ItineraryLeg (RideRequestId, SeqNo, ZoneId, FromPointId, ToPointId, ApproxStartTime, ApproxEndTime)
VALUES (@RideRequest3, 1, 3, 3, 7, DATEADD(HOUR, 3, GETUTCDATE()), DATEADD(HOUR, 3, DATEADD(MINUTE, 30, GETUTCDATE())));
SET @Leg1_RR3 = SCOPE_IDENTITY();

-- Ride Request 4: For Company Rep (For active ride)
INSERT INTO RideRequest (PassengerId, NumOfPeople, PickupAt, PickUpPoint, DropOffPoint, Status, RideProfileId, CreatedAt)
VALUES (@PassengerId, 2, DATEADD(MINUTE, -30, GETUTCDATE()), 4, 8, 'Accepted', @CompanyRepProfileId, DATEADD(HOUR, -1, GETUTCDATE()));
SET @RideRequest4 = SCOPE_IDENTITY();

INSERT INTO ItineraryLeg (RideRequestId, SeqNo, ZoneId, FromPointId, ToPointId, ApproxStartTime, ApproxEndTime)
VALUES (@RideRequest4, 1, 4, 4, 8, DATEADD(MINUTE, -30, GETUTCDATE()), DATEADD(MINUTE, -8, GETUTCDATE()));
SET @Leg1_RR4 = SCOPE_IDENTITY();

PRINT '✓ Created 4 ride requests with legs';

-- ============================================================================
-- STEP 4: Create dispatch offers
-- ============================================================================

PRINT '';
PRINT 'Creating Dispatch Offers...';

DECLARE @Offer1 INT, @Offer2 INT, @Offer3 INT, @Offer4 INT;

-- Offer 1: Sent to Driver (not yet responded)
INSERT INTO DispatchOffer (LegId, RecipientUserId, EnrollId, Status, SentAt)
VALUES (@Leg1_RR1, @DriverUserId, @DriverEnrollId, 'Sent', DATEADD(MINUTE, -10, GETUTCDATE()));
SET @Offer1 = SCOPE_IDENTITY();

-- Offer 2: Sent to Driver (active - for testing accept/decline)
INSERT INTO DispatchOffer (LegId, RecipientUserId, EnrollId, Status, SentAt)
VALUES (@Leg1_RR2, @DriverUserId, @DriverEnrollId, 'Sent', DATEADD(MINUTE, -5, GETUTCDATE()));
SET @Offer2 = SCOPE_IDENTITY();

-- Offer 3: Sent to Company Rep (not yet responded)
INSERT INTO DispatchOffer (LegId, RecipientUserId, EnrollId, Status, SentAt)
VALUES (@Leg1_RR3, @CompanyRepUserId, @CompanyRepEnrollId, 'Sent', DATEADD(MINUTE, -15, GETUTCDATE()));
SET @Offer3 = SCOPE_IDENTITY();

-- Offer 4: Accepted by Company Rep (to create ride)
INSERT INTO DispatchOffer (LegId, RecipientUserId, EnrollId, Status, SentAt, RespondedAt)
VALUES (@Leg1_RR4, @CompanyRepUserId, @CompanyRepEnrollId, 'Accepted', DATEADD(MINUTE, -45, GETUTCDATE()), DATEADD(MINUTE, -35, GETUTCDATE()));
SET @Offer4 = SCOPE_IDENTITY();

PRINT '✓ Created 4 dispatch offers';
PRINT '  - Driver has 2 pending offers (OfferIds: ' + CAST(@Offer1 AS NVARCHAR(10)) + ', ' + CAST(@Offer2 AS NVARCHAR(10)) + ')';
PRINT '  - Company Rep has 1 pending offer (OfferId: ' + CAST(@Offer3 AS NVARCHAR(10)) + ')';
PRINT '  - Company Rep accepted 1 offer (OfferId: ' + CAST(@Offer4 AS NVARCHAR(10)) + ')';

-- ============================================================================
-- STEP 5: Create rides from accepted offers
-- ============================================================================

PRINT '';
PRINT 'Creating Rides...';

-- Ride 1: Completed ride for Driver (past)
DECLARE @CompletedRideOffer INT;
INSERT INTO DispatchOffer (LegId, RecipientUserId, EnrollId, Status, SentAt, RespondedAt)
VALUES (@Leg1_RR1, @DriverUserId, @DriverEnrollId, 'Accepted', DATEADD(DAY, -1, GETUTCDATE()), DATEADD(DAY, -1, GETUTCDATE()));
SET @CompletedRideOffer = SCOPE_IDENTITY();

INSERT INTO Ride (OfferId, DriverUserId, PassengerUserId, VehicleId, StartedAt, EndedAt, DistanceKm, DurationMinutes, PriceFinal, Status)
VALUES (
    @CompletedRideOffer,
    @DriverUserId,
    @PassengerId,
    @DriverVehicleId,
    DATEADD(DAY, -1, GETUTCDATE()),
    DATEADD(HOUR, -23, GETUTCDATE()),
    12.5,
    28,
    25.00,
    'Completed'
);

-- Ride 2: InProgress ride for Company Rep (current)
INSERT INTO Ride (OfferId, DriverUserId, PassengerUserId, VehicleId, StartedAt, EndedAt, DistanceKm, DurationMinutes, PriceFinal, Status)
VALUES (
    @Offer4,
    @CompanyRepUserId,
    @PassengerId,
    @CompanyRepVehicleId,
    DATEADD(MINUTE, -30, GETUTCDATE()),
    DATEADD(MINUTE, 15, GETUTCDATE()),
    10.0,
    22,
    18.50,
    'InProgress'
);

-- Ride 3: Scheduled ride for Driver (future)
DECLARE @ScheduledDriverOffer INT;
INSERT INTO DispatchOffer (LegId, RecipientUserId, EnrollId, Status, SentAt, RespondedAt)
VALUES (@Leg1_RR2, @DriverUserId, @DriverEnrollId, 'Accepted', DATEADD(MINUTE, -20, GETUTCDATE()), DATEADD(MINUTE, -15, GETUTCDATE()));
SET @ScheduledDriverOffer = SCOPE_IDENTITY();

INSERT INTO Ride (OfferId, DriverUserId, PassengerUserId, VehicleId, StartedAt, EndedAt, DistanceKm, DurationMinutes, PriceFinal, Status)
VALUES (
    @ScheduledDriverOffer,
    @DriverUserId,
    @PassengerId,
    @DriverVehicleId,
    DATEADD(HOUR, 4, GETUTCDATE()),
    DATEADD(HOUR, 4, DATEADD(MINUTE, 18, GETUTCDATE())),
    8.3,
    18,
    16.00,
    'Scheduled'
);

-- Ride 4: Scheduled ride for Company Rep (future)
DECLARE @ScheduledCROffer INT;
INSERT INTO DispatchOffer (LegId, RecipientUserId, EnrollId, Status, SentAt, RespondedAt)
VALUES (@Leg1_RR3, @CompanyRepUserId, @CompanyRepEnrollId, 'Accepted', DATEADD(MINUTE, -25, GETUTCDATE()), DATEADD(MINUTE, -20, GETUTCDATE()));
SET @ScheduledCROffer = SCOPE_IDENTITY();

INSERT INTO Ride (OfferId, DriverUserId, PassengerUserId, VehicleId, StartedAt, EndedAt, DistanceKm, DurationMinutes, PriceFinal, Status)
VALUES (
    @ScheduledCROffer,
    @CompanyRepUserId,
    @PassengerId,
    @CompanyRepVehicleId,
    DATEADD(HOUR, 3, GETUTCDATE()),
    DATEADD(HOUR, 3, DATEADD(MINUTE, 30, GETUTCDATE())),
    15.2,
    30,
    28.00,
    'Scheduled'
);

PRINT '✓ Created 4 rides';
PRINT '  - Driver: 1 Completed, 1 Scheduled';
PRINT '  - Company Rep: 1 InProgress, 1 Scheduled';

-- ============================================================================
-- STEP 6: Verify the data
-- ============================================================================

PRINT '';
PRINT '================================================================================';
PRINT 'VERIFICATION SUMMARY';
PRINT '================================================================================';

PRINT '';
PRINT 'DRIVER (97519A61-D423-440D-9CA1-A11C45F7A054):';
PRINT '  Pending Offers:';
SELECT '    Offer ' + CAST(OfferId AS NVARCHAR(10)) + ' - Sent at: ' + CAST(SentAt AS NVARCHAR(30))
FROM DispatchOffer 
WHERE RecipientUserId = @DriverUserId AND Status = 'Sent';

PRINT '  Rides:';
SELECT '    Ride ' + CAST(RideId AS NVARCHAR(10)) + ' - Status: ' + Status + ', Started: ' + CAST(StartedAt AS NVARCHAR(30))
FROM Ride 
WHERE DriverUserId = @DriverUserId;

PRINT '';
PRINT 'COMPANY REPRESENTATIVE (4170C7A2-56EC-4AE8-8EEB-6833F657C571):';
PRINT '  Pending Offers:';
SELECT '    Offer ' + CAST(OfferId AS NVARCHAR(10)) + ' - Sent at: ' + CAST(SentAt AS NVARCHAR(30))
FROM DispatchOffer 
WHERE RecipientUserId = @CompanyRepUserId AND Status = 'Sent';

PRINT '  Rides:';
SELECT '    Ride ' + CAST(RideId AS NVARCHAR(10)) + ' - Status: ' + Status + ', Started: ' + CAST(StartedAt AS NVARCHAR(30))
FROM Ride 
WHERE DriverUserId = @CompanyRepUserId;

PRINT '';
PRINT '================================================================================';
PRINT 'TEST DATA CREATION COMPLETE!';
PRINT '================================================================================';
PRINT '';
PRINT 'You can now test:';
PRINT '  1. Driver Dashboard - Should see 2 pending offers, 1 completed ride, 1 scheduled ride';
PRINT '  2. Company Rep Dashboard - Should see 1 pending offer, 1 in-progress ride, 1 scheduled ride';
PRINT '  3. Offers Tab - Accept/Decline functionality';
PRINT '  4. Rides Tab - View all rides by status';
