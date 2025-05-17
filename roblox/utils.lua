-- IndiGo Airlines Utility Functions
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")

local Utils = {}

-- Math utilities
function Utils.Round(number, decimals)
    local power = 10 ^ decimals
    return math.floor(number * power + 0.5) / power
end

function Utils.Lerp(a, b, t)
    return a + (b - a) * t
end

function Utils.GetDistance(pos1, pos2)
    return (pos1 - pos2).Magnitude
end

function Utils.GetHeading(forward)
    local heading = math.deg(math.atan2(forward.X, forward.Z))
    return heading < 0 and heading + 360 or heading
end

function Utils.FormatNumber(number, unit)
    return string.format("%d%s", math.floor(number), unit or "")
end

-- Aircraft utilities
function Utils.CalculateGroundSpeed(velocity)
    local horizontalVelocity = Vector3.new(velocity.X, 0, velocity.Z)
    return horizontalVelocity.Magnitude * 1.944 -- Convert to knots
end

function Utils.CalculateVerticalSpeed(velocity)
    return velocity.Y * 196.85 -- Convert to feet per minute
end

function Utils.CalculateFuelConsumption(thrust, altitude)
    -- Basic fuel consumption model
    local baseFuel = thrust * 0.1
    local altitudeFactor = 1 - (altitude / 40000) * 0.2
    return baseFuel * altitudeFactor
end

-- Weather utilities
function Utils.GenerateWind(altitude, config)
    local windLayer
    for _, layer in pairs(config.weather.windLayers) do
        if altitude >= layer.min and altitude <= layer.max then
            windLayer = layer
            break
        end
    end
    
    if not windLayer then return Vector3.new(0, 0, 0) end
    
    -- Generate wind based on layer
    local windSpeed = math.random(5, 50)
    local windDirection = math.rad(math.random(0, 359))
    return Vector3.new(
        math.cos(windDirection) * windSpeed,
        0,
        math.sin(windDirection) * windSpeed
    )
end

function Utils.CalculateVisibility(weather)
    -- Calculate visibility based on weather conditions
    local baseVisibility = weather.cloudCover and (10000 - weather.cloudCover * 50) or 10000
    if weather.precipitation then
        baseVisibility = baseVisibility * (1 - weather.precipitation * 0.5)
    end
    return math.max(100, baseVisibility)
end

-- UI utilities
function Utils.CreateLabel(text, parent)
    local label = Instance.new("TextLabel")
    label.Size = UDim2.new(1, 0, 0, 20)
    label.BackgroundTransparency = 1
    label.TextColor3 = Color3.fromRGB(255, 255, 255)
    label.Text = text
    label.Parent = parent
    return label
end

function Utils.CreateButton(text, callback)
    local button = Instance.new("TextButton")
    button.Size = UDim2.new(0, 100, 0, 30)
    button.BackgroundColor3 = Color3.fromRGB(0, 120, 215)
    button.TextColor3 = Color3.fromRGB(255, 255, 255)
    button.Text = text
    button.MouseButton1Click:Connect(callback)
    return button
end

function Utils.CreateProgressBar(parent)
    local frame = Instance.new("Frame")
    frame.Size = UDim2.new(1, 0, 0, 20)
    frame.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
    
    local fill = Instance.new("Frame")
    fill.Size = UDim2.new(0, 0, 1, 0)
    fill.BackgroundColor3 = Color3.fromRGB(0, 255, 0)
    fill.Parent = frame
    
    frame.Parent = parent
    return {
        frame = frame,
        fill = fill,
        SetProgress = function(progress)
            fill.Size = UDim2.new(math.clamp(progress, 0, 1), 0, 1, 0)
        end
    }
end

-- Network utilities
function Utils.SendRequest(url, method, data)
    local success, response = pcall(function()
        return HttpService:RequestAsync({
            Url = url,
            Method = method,
            Headers = {
                ["Content-Type"] = "application/json"
            },
            Body = data and HttpService:JSONEncode(data) or nil
        })
    end)
    
    if success and response.Success then
        return true, HttpService:JSONDecode(response.Body)
    else
        return false, "Request failed"
    end
end

-- Debug utilities
function Utils.DebugDraw(points, color, duration)
    if not RunService:IsStudio() then return end
    
    color = color or Color3.new(1, 0, 0)
    duration = duration or 1
    
    for i = 1, #points - 1 do
        local p1, p2 = points[i], points[i + 1]
        local line = Instance.new("LineHandleAdornment")
        line.Length = (p2 - p1).Magnitude
        line.CFrame = CFrame.new(p1, p2)
        line.Color3 = color
        line.Parent = workspace
        
        delay(duration, function()
            line:Destroy()
        end)
    end
end

function Utils.LogDebug(message, level)
    level = level or "info"
    if RunService:IsStudio() then
        print(string.format("[%s] %s", level:upper(), message))
    end
end

-- Performance utilities
Utils.Performance = {
    Markers = {},
    
    StartMeasure = function(name)
        Utils.Performance.Markers[name] = tick()
    end,
    
    EndMeasure = function(name)
        local startTime = Utils.Performance.Markers[name]
        if startTime then
            local duration = tick() - startTime
            Utils.Performance.Markers[name] = nil
            return duration
        end
        return 0
    end,
    
    Throttle = function(func, limit)
        local lastRun = 0
        return function(...)
            local now = tick()
            if now - lastRun >= limit then
                lastRun = now
                return func(...)
            end
        end
    end
}

-- Validation utilities
function Utils.ValidateFlightPlan(flightPlan, config)
    local errors = {}
    
    -- Check required fields
    local required = {"departure", "arrival", "aircraft", "cruiseAltitude"}
    for _, field in ipairs(required) do
        if not flightPlan[field] then
            table.insert(errors, string.format("Missing required field: %s", field))
        end
    end
    
    -- Validate airports
    if flightPlan.departure and not config.airports[flightPlan.departure] then
        table.insert(errors, "Invalid departure airport")
    end
    if flightPlan.arrival and not config.airports[flightPlan.arrival] then
        table.insert(errors, "Invalid arrival airport")
    end
    
    -- Validate aircraft
    if flightPlan.aircraft and not config.aircraft[flightPlan.aircraft] then
        table.insert(errors, "Invalid aircraft type")
    end
    
    -- Validate altitude
    if flightPlan.cruiseAltitude then
        local aircraft = config.aircraft[flightPlan.aircraft]
        if aircraft and flightPlan.cruiseAltitude > aircraft.maxAltitude then
            table.insert(errors, "Cruise altitude exceeds aircraft maximum")
        end
    end
    
    return #errors == 0, errors
end

function Utils.ValidateClearance(clearance, config)
    local validTypes = {
        "pushback",
        "taxi",
        "takeoff",
        "landing",
        "approach"
    }
    
    if not table.find(validTypes, clearance.type) then
        return false, "Invalid clearance type"
    end
    
    if not clearance.flightNumber then
        return false, "Missing flight number"
    end
    
    return true
end

return Utils
