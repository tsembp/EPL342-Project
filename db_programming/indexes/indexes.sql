-- for the user login
CREATE UNIQUE INDEX [idx_emails]
ON dbo.[User](Email);

-- Filtering drivers/roles that are verified
CREATE NONCLUSTERED INDEX [idx_User_Role_Verified]
ON dbo.[User](Role, Verified);

-- for searching a passenger's Rides
CREATE NONCLUSTERED INDEX [idx_RideRequest_Passenger_Status_CreatedAt]
ON dbo.RideRequest (PassengerId, Status, CreatedAt DESC);

-- for searching ride requests by secuence (could be optional)
CREATE NONCLUSTERED INDEX [idx_ItineraryLeg_RideRequestId_SeqNo]
ON dbo.ItineraryLeg (RideRequestId, SeqNo);

-- all offers of this driver
CREATE NONCLUSTERED INDEX [idx_Recipirny_Status_SentAt]
ON dbo.DispatchOffer (RecipientUserId, Status, SentAt DESC);

-- for finding the rides of a passenger
CREATE NONCLUSTERED INDEX [idx_Passenger_Ride_History]
ON dbo.Ride(PassengerUserId, StartedAt DESC);

-- for finding the rides of a driver
CREATE NONCLUSTERED INDEX [idx_Driver_Ride_History]
ON dbo.Ride(DriverUserId, StartedAt DESC);

-- for finding active driver's in a certain geofence zone
CREATE NONCLUSTERED INDEX [idx_DriverAvailability]
ON dbo.DriverAvailability (GeofencezoneId, AvailabilityDate);

-- ind offers by LegId
CREATE NONCLUSTERED INDEX [idx_DispatchOffer_LegId]
ON dbo.DispatchOffer (LegId);

-- indexes for speeding up lookups for BFS
CREATE NONCLUSTERED INDEX [idx_Bridge_FromZone]
ON dbo.Bridge (FromZoneId);

CREATE NONCLUSTERED INDEX [idx_Bridge_ToZone]
ON dbo.Bridge (ToZoneId);

-- for finding all the driver's/CR's vehicles
CREATE NONCLUSTERED INDEX [idx_Vehicle_Owner_Status]
ON dbo.Vehicle (OwnerUserId, Status);

-- for finding all a driver's/CR's enrollments
CREATE NONCLUSTERED INDEX [idx_UserEnrollments]
ON dbo.UserServiceEnrollment (UserId, Status);

-- for finding the docs of a specific vehicle
CREATE NONCLUSTERED INDEX [idx_VehicleDocument_Status]
ON dbo.VehicleDocument (VehicleId, Status);

-- for finding the docs of a specific User 
CREATE NONCLUSTERED INDEX [idx_PersonDocument_Status]
ON dbo.PersonDocument (UserId, Status);

-- for finding the messages of a specific ride
CREATE NONCLUSTERED INDEX [idx_InAppMessage_Ride_SentAt]
ON dbo.InAppMessage (Ride, SentAt DESC);

-- ?
CREATE NONCLUSTERED INDEX [idx_Ride_StartedAt_Driver]
ON dbo.Ride (StartedAt DESC, DriverUserId);
