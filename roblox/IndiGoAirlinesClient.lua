-- IndiGo Airlines Client Script
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local HttpService = game:GetService("HttpService")

local player = Players.LocalPlayer
local events = ReplicatedStorage:WaitForChild("IndiGoEvents")
local startFlight = events:WaitForChild("StartFlight")
local issueClearance = events:WaitForChild("IssueClearance")

-- UI Module
local UI = {}

function UI:CreatePilotUI()
    local pilotUI = Instance.new("ScreenGui")
    pilotUI.Name = "PilotUI"
    
    -- Create flight controls panel
    local controlsPanel = Instance.new("Frame")
    controlsPanel.Name = "ControlsPanel"
    controlsPanel.Size = UDim2.new(0.2, 0, 0.5, 0)
    controlsPanel.Position = UDim2.new(0.8, 0, 0.25, 0)
    controlsPanel.BackgroundTransparency = 0.5
    controlsPanel.Parent = pilotUI
    
    -- Add flight instruments
    local instruments = {
        {name = "Altitude", unit = "ft"},
        {name = "Speed", unit = "kts"},
        {name = "Heading", unit = "°"},
        {name = "VerticalSpeed", unit = "fpm"}
    }
    
    for i, instrument in ipairs(instruments) do
        local frame = Instance.new("Frame")
        frame.Name = instrument.name .. "Frame"
        frame.Size = UDim2.new(0.9, 0, 0.15, 0)
        frame.Position = UDim2.new(0.05, 0, 0.05 + (i-1) * 0.2, 0)
        frame.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
        frame.Parent = controlsPanel
        
        local label = Instance.new("TextLabel")
        label.Name = instrument.name .. "Label"
        label.Size = UDim2.new(1, 0, 0.4, 0)
        label.Text = instrument.name
        label.TextColor3 = Color3.fromRGB(200, 200, 200)
        label.Parent = frame
        
        local value = Instance.new("TextLabel")
        value.Name = instrument.name .. "Value"
        value.Size = UDim2.new(1, 0, 0.6, 0)
        value.Position = UDim2.new(0, 0, 0.4, 0)
        value.Text = "0 " .. instrument.unit
        value.TextColor3 = Color3.fromRGB(255, 255, 255)
        value.Parent = frame
    end
    
    pilotUI.Parent = player:WaitForChild("PlayerGui")
    return pilotUI
end

function UI:CreateATCUI()
    local atcUI = Instance.new("ScreenGui")
    atcUI.Name = "ATCUI"
    
    -- Create radar panel
    local radarPanel = Instance.new("Frame")
    radarPanel.Name = "RadarPanel"
    radarPanel.Size = UDim2.new(0.6, 0, 0.8, 0)
    radarPanel.Position = UDim2.new(0.2, 0, 0.1, 0)
    radarPanel.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
    radarPanel.Parent = atcUI
    
    -- Create clearance panel
    local clearancePanel = Instance.new("Frame")
    clearancePanel.Name = "ClearancePanel"
    clearancePanel.Size = UDim2.new(0.2, 0, 0.8, 0)
    clearancePanel.Position = UDim2.new(0.8, 0, 0.1, 0)
    clearancePanel.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
    clearancePanel.Parent = atcUI
    
    -- Add clearance buttons
    local clearanceTypes = {
        "Pushback",
        "Taxi",
        "Takeoff",
        "Landing",
        "Approach"
    }
    
    for i, clearanceType in ipairs(clearanceTypes) do
        local button = Instance.new("TextButton")
        button.Name = clearanceType .. "Button"
        button.Size = UDim2.new(0.9, 0, 0.1, 0)
        button.Position = UDim2.new(0.05, 0, 0.05 + (i-1) * 0.15, 0)
        button.Text = clearanceType .. " Clearance"
        button.Parent = clearancePanel
        
        button.MouseButton1Click:Connect(function()
            local selectedFlight = atcUI:GetAttribute("SelectedFlight")
            if selectedFlight then
                issueClearance:FireServer(selectedFlight, clearanceType:lower())
            end
        end)
    end
    
    atcUI.Parent = player:WaitForChild("PlayerGui")
    return atcUI
end

-- Flight Control Module
local FlightControl = {}

function FlightControl:Initialize(aircraft)
    local controls = {
        throttle = 0,
        pitch = 0,
        roll = 0,
        yaw = 0
    }
    
    -- Handle flight controls
    UserInputService.InputBegan:Connect(function(input)
        if input.KeyCode == Enum.KeyCode.W then
            controls.pitch = 1
        elseif input.KeyCode == Enum.KeyCode.S then
            controls.pitch = -1
        elseif input.KeyCode == Enum.KeyCode.A then
            controls.roll = -1
        elseif input.KeyCode == Enum.KeyCode.D then
            controls.roll = 1
        elseif input.KeyCode == Enum.KeyCode.Q then
            controls.yaw = -1
        elseif input.KeyCode == Enum.KeyCode.E then
            controls.yaw = 1
        elseif input.KeyCode == Enum.KeyCode.Space then
            controls.throttle = math.min(controls.throttle + 0.1, 1)
        elseif input.KeyCode == Enum.KeyCode.LeftShift then
            controls.throttle = math.max(controls.throttle - 0.1, 0)
        end
    end)
    
    UserInputService.InputEnded:Connect(function(input)
        if input.KeyCode == Enum.KeyCode.W or input.KeyCode == Enum.KeyCode.S then
            controls.pitch = 0
        elseif input.KeyCode == Enum.KeyCode.A or input.KeyCode == Enum.KeyCode.D then
            controls.roll = 0
        elseif input.KeyCode == Enum.KeyCode.Q or input.KeyCode == Enum.KeyCode.E then
            controls.yaw = 0
        end
    end)
    
    -- Update aircraft physics
    game:GetService("RunService").Heartbeat:Connect(function(dt)
        if aircraft and aircraft.PrimaryPart then
            local cf = aircraft.PrimaryPart.CFrame
            local right = cf.RightVector
            local up = cf.UpVector
            local forward = cf.LookVector
            
            -- Apply control inputs
            local pitchTorque = up * controls.pitch * 1000
            local rollTorque = forward * controls.roll * 1000
            local yawTorque = up * controls.yaw * 1000
            
            -- Apply forces
            aircraft.PrimaryPart.Velocity = forward * (controls.throttle * 100)
            aircraft.PrimaryPart:ApplyAngularImpulse(pitchTorque + rollTorque + yawTorque)
        end
    end)
    
    return controls
end

-- Main Client Module
local IndiGoAirlinesClient = {}

function IndiGoAirlinesClient:Initialize()
    local role = player:GetAttribute("Role")
    
    if role == "pilot" then
        local pilotUI = UI:CreatePilotUI()
        
        -- Handle aircraft interaction
        player.CharacterAdded:Connect(function(character)
            character:WaitForChild("Humanoid").Seated:Connect(function(active, seat)
                if active and seat:IsA("VehicleSeat") then
                    local aircraft = seat:FindFirstAncestorWhichIsA("Model")
                    if aircraft then
                        local controls = FlightControl:Initialize(aircraft)
                        startFlight:FireServer(aircraft, {
                            pilotId = player.UserId,
                            flightNumber = aircraft:GetAttribute("FlightNumber")
                        })
                    end
                end
            end)
        end)
    elseif role == "atc" then
        local atcUI = UI:CreateATCUI()
        
        -- Handle radar updates
        game:GetService("RunService").Heartbeat:Connect(function()
            local radarPanel = atcUI.RadarPanel
            radarPanel:ClearAllChildren()
            
            for _, aircraft in pairs(workspace:GetChildren()) do
                if aircraft:GetAttribute("FlightNumber") then
                    local blip = Instance.new("Frame")
                    blip.Name = "Blip"
                    blip.Size = UDim2.new(0.02, 0, 0.02, 0)
                    
                    local pos = aircraft:GetPrimaryPartCFrame().Position
                    local x = (pos.X / 2000) + 0.5
                    local y = (pos.Z / 2000) + 0.5
                    
                    blip.Position = UDim2.new(x, 0, y, 0)
                    blip.BackgroundColor3 = Color3.fromRGB(0, 255, 0)
                    blip.Parent = radarPanel
                    
                    -- Add flight info label
                    local label = Instance.new("TextLabel")
                    label.Size = UDim2.new(0, 100, 0, 20)
                    label.Position = UDim2.new(1.2, 0, 0, 0)
                    label.Text = aircraft:GetAttribute("FlightNumber")
                    label.Parent = blip
                    
                    -- Handle blip selection
                    blip.InputBegan:Connect(function(input)
                        if input.UserInputType == Enum.UserInputType.MouseButton1 then
                            atcUI:SetAttribute("SelectedFlight", aircraft:GetAttribute("FlightNumber"))
                        end
                    end)
                end
            end
        end)
    end
end

return IndiGoAirlinesClient
