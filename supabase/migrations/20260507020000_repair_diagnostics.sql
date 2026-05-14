-- ============================================================
-- REPAIR DIAGNOSTICS MODULE
-- Allows admins to define symptoms and potential diagnoses.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.repair_diagnostics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symptom_id TEXT NOT NULL, -- e.g. 'power', 'battery', 'screen'
    title TEXT NOT NULL, -- e.g. 'Dead Battery'
    symptom_description TEXT NOT NULL, -- Detailed description of what user sees
    solution_description TEXT NOT NULL, -- Expert advice
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    cost_range TEXT, -- e.g. 'Rs. 1,500 - 5,500'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.repair_diagnostics ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public can view active diagnostics" ON public.repair_diagnostics;
CREATE POLICY "Public can view active diagnostics" 
    ON public.repair_diagnostics FOR SELECT 
    USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage diagnostics" ON public.repair_diagnostics;
CREATE POLICY "Admins can manage diagnostics" 
    ON public.repair_diagnostics FOR ALL 
    USING (public.is_staff_admin());

-- Seed initial data (matching current hardcoded values)
INSERT INTO public.repair_diagnostics (symptom_id, title, symptom_description, solution_description, severity, cost_range)
VALUES 
('power', 'Dead Battery', 'Device doesn''t turn on or charge.', 'Battery replacement is likely needed. Check charging port for debris first.', 'medium', 'Rs. 1,500 - 5,500'),
('power', 'Motherboard Short', 'Device is hot but screen is black.', 'Requires board-level micro-soldering. Visit a specialist immediately.', 'high', 'Rs. 3,500 - 12,000'),
('battery', 'Degraded Battery', 'Battery drains fast or shuts off at 20%.', 'Battery health is low. Replacement will restore original performance.', 'low', 'Rs. 1,200 - 4,500'),
('battery', 'Faulty Charging IC', 'Plugged in but not increasing percentage.', 'Charging chip on motherboard needs repair or replacement.', 'medium', 'Rs. 2,500 - 6,000'),
('screen', 'Digitizer Failure', 'Screen works but touch is unresponsive.', 'Display assembly replacement is standard for modern devices.', 'medium', 'Rs. 3,000 - 15,000'),
('screen', 'LCD/OLED Damage', 'Lines on screen or black spots.', 'Inner display is cracked. Full screen replacement required.', 'high', 'Rs. 5,000 - 45,000'),
('audio', 'Blown Speaker', 'Sound is crackling or distorted.', 'Speaker component replacement is required.', 'low', 'Rs. 1,000 - 3,500'),
('connectivity', 'Wifi Chip Failure', 'Wifi button is greyed out or won''t connect.', 'Wifi module on motherboard may need repair.', 'medium', 'Rs. 2,000 - 5,000'),
('camera', 'Focus Mechanism Failure', 'Camera cannot focus on nearby or distant objects.', 'Camera module replacement is usually the only fix.', 'medium', 'Rs. 2,500 - 8,000'),
('heat', 'Thermal Paste Degraded', 'Device gets hot during normal use.', 'Internal cleaning and thermal paste re-application recommended.', 'low', 'Rs. 800 - 2,500'),
('security', 'OS Corruption', 'Stuck on logo or boot loop.', 'Software re-flashing or factory reset may resolve the issue.', 'medium', 'Rs. 500 - 2,000');
