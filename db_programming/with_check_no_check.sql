-- Disable FK from RideRequest -> Passenger
ALTER TABLE dbo.RideRequest
    NOCHECK CONSTRAINT [FK_RideRequest_Passenger];

-- Disable FK from ItineraryLeg -> RideRequest
ALTER TABLE dbo.ItineraryLeg
    NOCHECK CONSTRAINT [FK_ItineraryLeg_RideRequest];

-- 3) Disable CHECK constraint on geofence coordinates
ALTER TABLE dbo.GeofenceZone
    NOCHECK CONSTRAINT [CK_GeofenceZone_Coords];


-- Invalid insert with non-existing passenger id
INSERT INTO dbo.RideRequest (
    PassengerId,
    NumOfPeople,
    PickupAt,
    PickUpPoint,
    DropOffPoint,
    CreatedAt,
    UpdatedAt,
    Status,
    RideProfileId
) VALUES (
    'c4574dbe-aac1-4858-ad46-aaaaaa4f38d', -- non existing passenger
    2,
    GETUTCDATE(),
    101,
    202,
    GETUTCDATE(),
    NULL,
    'Pending',
    'fd7835d8-ace4-474b-b5ba-05440e324b73' -- valid ride profile
);

-- Insert invalid with non-existing ride request id
INSERT INTO dbo.ItineraryLeg (
    RideRequestId,
    SeqNo,
    ZoneId,
    FromPointId,
    ToPointId,
    ApproxStartTime,
    ApproxEndTime
) VALUES (
    '23456788765456781', -- non existing ride request
    '1',
    '5',
    '6',
    '1',
    '2025-12-06 10:00:00',
    '2025-12-06 11:00:00'
);

-- Insert invalid with invalid coordinates
INSERT INTO dbo.GeofenceZone (
    MinLat,
    MinLng,
    MaxLat,
    MaxLng,
    Name,
    CreatedAt,
    UpdatedAt
) VALUES (
    35.123456,
    33.123456,
    34.000000,
    32.000000,
    N'Invalid Zone',
    GETUTCDATE(),
    NULL
);

-- Re-enable FK and CHECK constraints
ALTER TABLE dbo.RideRequest
    WITH CHECK CHECK CONSTRAINT [FK_RideRequest_Passenger];

ALTER TABLE dbo.ItineraryLeg
    WITH CHECK CHECK CONSTRAINT [FK_ItineraryLeg_RideRequest];

-- Re-enable and DONT CHECK the coordinates constraint
ALTER TABLE dbo.GeofenceZone
    WITH NOCHECK CHECK CONSTRAINT [CK_GeofenceZone_Coords];
