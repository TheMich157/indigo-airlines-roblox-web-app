-- IndiGo Airlines Main Script
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

-- Configuration
local config = {
    apiBaseUrl = "http://localhost:8000/api",
    groupId = 12345678, -- Replace with your actual group ID
    requiredRank = 1,   -- Minimum rank required to access features
}

-- Authentication Module
local Auth = {}

function Auth:GetAuthToken(player)
    -- Get OAuth token from player
    local success, token = pcall(function()
        return player:GetAttribute("OAuthToken")
    end)
    return success and token
end

function Auth:VerifyGroupMembership(player)
    if not player:IsInGroup(config.groupId) then
        return false, "You must be a member of IndiGo Airlines group"
    end
    return true
end

function Auth:GetUserRole(player)
    local rank = player:GetRankInGroup(config.groupId)
    if rank >= 100 then return "admin"
    elseif rank >= 50 then return "atc"
    elseif rank >= 10 then return "pilot"
    else return "passenger"
    end
end

-- API Communication Module
local API = {}

function API:Request(method, endpoint, data, auth)
    local url = config.apiBaseUrl .. endpoint
    local headers = {
        ["Content-Type"] = "application/json"
    }
    if auth then
        headers["Authorization"] = "Bearer " .. auth
    end

    local success, response = pcall(function()
        return HttpService:RequestAsync({
            Url = url,
            Method = method,
            Headers = headers,
            Body = data and HttpService:JSONEncode(data) or nil
        })
    end)

    if success and response.Success then
        return true, HttpService:JSONDecode(response.Body)
    else
        return false, "API request failed"
    end
end

-- Flight System Module
local FlightSystem = {}

function FlightSystem:InitializeAircraft(aircraft)
    -- Set up aircraft controls and systems
    local controls = {}
    
    -- Basic flight controls
    controls.throttle = 0
    controls.pitch = 0
    controls.roll = 0
    controls.yaw = 0
    
    -- Aircraft state
    aircraft:SetAttribute("EngineStatus", "OFF")
    aircraft:SetAttribute("LandingGear", true)
    aircraft:SetAttribute("Flaps", 0)
    
    -- Create pilot seat interaction
    local seat = aircraft:WaitForChild("PilotSeat")
    seat.Changed:Connect(function(property)
        if property == "Occupant" then
            local pilot = seat.Occupant
            if pilot then
                -- Verify pilot permissions
                local success, role = Auth:GetUserRole(pilot)
                if role ~= "pilot" then
                    pilot:Kick("Only pilots can operate aircraft")
                end
            end
        end
    end)
    
    return controls
end

function FlightSystem:StartFlight(aircraft, flightData)
    -- Validate flight plan
    local success, response = API:Request("POST", "/pilot/flight-plan", flightData)
    if not success then return false, response end
    
    -- Initialize flight systems
    local controls = self:InitializeAircraft(aircraft)
    
    -- Set up flight monitoring
    spawn(function()
        while aircraft:GetAttribute("EngineStatus") == "ON" do
            local position = aircraft:GetPrimaryPartCFrame().Position
            local altitude = position.Y
            local speed = aircraft.PrimaryPart.Velocity.Magnitude
            
            -- Update flight data
            API:Request("POST", "/pilot/update-flight", {
                flightId = flightData.id,
                position = {x = position.X, y = position.Y, z = position.Z},
                altitude = altitude,
                speed = speed
            })
            
            wait(1)
        end
    end)
    
    return true
end

-- ATC System Module
local ATCSystem = {}

function ATCSystem:Initialize()
    -- Set up ATC workspace
    local atcWorkspace = Instance.new("Folder")
    atcWorkspace.Name = "ATCSystem"
    atcWorkspace.Parent = game.Workspace
    
    -- Create radar visualization
    local radar = Instance.new("Part")
    radar.Name = "Radar"
    radar.Anchored = true
    radar.CanCollide = false
    radar.Transparency = 0.5
    radar.Parent = atcWorkspace
    
    -- Set up flight tracking
    spawn(function()
        while true do
            local activeFlights = {}
            for _, aircraft in pairs(game.Workspace:GetChildren()) do
                if aircraft:GetAttribute("FlightNumber") then
                    table.insert(activeFlights, {
                        flightNumber = aircraft:GetAttribute("FlightNumber"),
                        position = aircraft:GetPrimaryPartCFrame().Position,
                        altitude = aircraft:GetPrimaryPartCFrame().Position.Y,
                        status = aircraft:GetAttribute("FlightStatus")
                    })
                end
            end
            
            -- Update ATC dashboard
            API:Request("POST", "/atc/update-flights", {flights = activeFlights})
            
            wait(1)
        end
    end)
end

function ATCSystem:IssueClearance(flightNumber, clearanceType)
    local aircraft = nil
    for _, v in pairs(game.Workspace:GetChildren()) do
        if v:GetAttribute("FlightNumber") == flightNumber then
            aircraft = v
            break
        end
    end
    
    if not aircraft then return false, "Aircraft not found" end
    
    -- Process clearance
    local clearanceData = {
        flightNumber = flightNumber,
        type = clearanceType,
        timestamp = os.time()
    }
    
    local success, response = API:Request("POST", "/atc/clearance", clearanceData)
    if success then
        aircraft:SetAttribute("LastClearance", clearanceType)
    end
    
    return success, response
end

-- Voice Communication System
local VoiceSystem = {}

function VoiceSystem:Initialize()
    local voiceChat = game:GetService("VoiceChat")
    
    -- Set up voice channels
    local channels = {
        ground = voiceChat:CreateChannel("Ground", "121.9"),
        tower = voiceChat:CreateChannel("Tower", "118.1"),
        approach = voiceChat:CreateChannel("Approach", "119.1"),
        departure = voiceChat:CreateChannel("Departure", "125.2")
    }
    
    -- Handle channel joining
    Players.PlayerAdded:Connect(function(player)
        local role = Auth:GetUserRole(player)
        if role == "atc" or role == "pilot" then
            -- Allow ATC and pilots to use voice chat
            voiceChat:EnableVoiceChat(player)
        end
    end)
    
    return channels
end

-- Main Game Module
local IndiGoAirlines = {}

function IndiGoAirlines:Initialize()
    -- Initialize systems
    ATCSystem:Initialize()
    local voiceChannels = VoiceSystem:Initialize()
    
    -- Handle player joining
    Players.PlayerAdded:Connect(function(player)
        -- Verify group membership
        local inGroup, message = Auth:VerifyGroupMembership(player)
        if not inGroup then
            player:Kick(message)
            return
        end
        
        -- Set up player data
        local role = Auth:GetUserRole(player)
        player:SetAttribute("Role", role)
        
        -- Handle role-specific setup
        if role == "pilot" then
            -- Give pilot tools
            local flightTools = game.ReplicatedStorage.PilotTools:Clone()
            flightTools.Parent = player.Backpack
        elseif role == "atc" then
            -- Give ATC tools
            local atcTools = game.ReplicatedStorage.ATCTools:Clone()
            atcTools.Parent = player.Backpack
        end
    end)
    
    -- Set up remote events
    local Events = Instance.new("Folder")
    Events.Name = "IndiGoEvents"
    Events.Parent = game.ReplicatedStorage
    
    local StartFlight = Instance.new("RemoteEvent")
    StartFlight.Name = "StartFlight"
    StartFlight.Parent = Events
    
    local IssueClearance = Instance.new("RemoteEvent")
    IssueClearance.Name = "IssueClearance"
    IssueClearance.Parent = Events
    
    -- Handle remote events
    StartFlight.OnServerEvent:Connect(function(player, aircraft, flightData)
        if Auth:GetUserRole(player) ~= "pilot" then return end
        FlightSystem:StartFlight(aircraft, flightData)
    end)
    
    IssueClearance.OnServerEvent:Connect(function(player, flightNumber, clearanceType)
        if Auth:GetUserRole(player) ~= "atc" then return end
        ATCSystem:IssueClearance(flightNumber, clearanceType)
    end)
end

return IndiGoAirlines
