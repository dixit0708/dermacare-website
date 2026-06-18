import React, { useEffect, useState } from 'react'
import {
  Paper, TextField, Button, Box, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from '@mui/material'
import { toast } from 'sonner'
import Autocomplete from '@mui/material/Autocomplete'
import { PersonSearch as PersonSearchIcon } from '@mui/icons-material'
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material'
import api from '@/dpms/api'
import { useNavigate } from 'react-router-dom'

export default function AppointmentForm({ onCreated }) {
  const [patients, setPatients] = useState([])
  const [patientInput, setPatientInput] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [dateTime, setDateTime] = useState('')
  const [therapist, setTherapist] = useState('')
  const [loading, setLoading] = useState(false)

  // Dialog for "patient not found" warning
  const [notFoundDialog, setNotFoundDialog] = useState(false)
  // Dialog for duplicate / already-registered reminder
  const [existingPatientDialog, setExistingPatientDialog] = useState({ open: false, patient: null })

  const navigate = useNavigate()

  const handleDateChange = (val) => {
    if (!val) return val;
    const d = new Date(val);
    const m = d.getMinutes();
    if (m !== 0 && m !== 30) {
      const snapped = m < 15 ? 0 : (m < 45 ? 30 : 0);
      d.setMinutes(snapped);
      if (snapped === 0 && m >= 45) d.setHours(d.getHours() + 1);
      const yyyy = d.getFullYear();
      const MM = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const HH = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${yyyy}-${MM}-${dd}T${HH}:${min}`;
    }
    return val;
  }

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await api.get('/api/patients', { params: { per_page: 200 } })
        setPatients(res.data.items || [])
      } catch (e) {
        console.error('fetch patients', e)
      }
    }
    fetchPatients()
  }, [])

  // When a patient is selected from autocomplete, check if they're already registered
  const handlePatientSelect = (e, value) => {
    if (typeof value === 'string') {
      setPatientInput(value)
      setSelectedPatient(null)
    } else if (value) {
      setSelectedPatient(value)
      setPatientInput(value.patient_id)
      // Show informational note that this patient IS in our records
      setExistingPatientDialog({ open: true, patient: value })
    } else {
      setSelectedPatient(null)
      setPatientInput('')
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)

    let patient_id = selectedPatient?.patient_id || null
    if (!patient_id) {
      const found = patients.find(
        (p) =>
          p.patient_id === patientInput ||
          p.whatsapp === patientInput ||
          (p.full_name || '').toLowerCase() === (patientInput || '').toLowerCase()
      )
      if (found) {
        patient_id = found.patient_id
      }
    }

    if (!patient_id) {
      // Patient not found — show friendly dialog instead of alert
      setNotFoundDialog(true)
      setLoading(false)
      return
    }

    if (!dateTime) {
      toast.error('Please select a date and time for the appointment.')
      setLoading(false)
      return
    }

    try {
      await api.post('/api/appointments', {
        patient_id,
        date_time: new Date(dateTime).toISOString(),
        therapist
      })
      toast.success('Appointment scheduled successfully!')
      setDateTime('')
      setTherapist('')
      setPatientInput('')
      setSelectedPatient(null)
      if (onCreated) onCreated()
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Failed to create appointment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={1}>Schedule Appointment</Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
          Search for an existing patient by name, ID, or WhatsApp number.
        </Typography>
        <form onSubmit={submit}>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-start">
            <Autocomplete
              freeSolo
              options={patients}
              getOptionLabel={(option) =>
                typeof option === 'string' ? option : `${option.patient_id} – ${option.full_name}`
              }
              onChange={handlePatientSelect}
              onInputChange={(e, value) => setPatientInput(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Patient (ID, name or WhatsApp)"
                  sx={{ minWidth: 320 }}
                  helperText="Start typing to search registered patients"
                />
              )}
            />

            <TextField
              label="Date & Time"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(handleDateChange(e.target.value))}
              sx={{ width: 240 }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 1800 }}
            />

            <TextField
              label="Therapist"
              value={therapist}
              onChange={(e) => setTherapist(e.target.value)}
              sx={{ width: 200 }}
            />

            <Button type="submit" variant="contained" disabled={loading} sx={{ height: 40, alignSelf: 'flex-start', mt: 0.5 }}>
              {loading ? 'Booking...' : 'Book Appointment'}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* ── Patient Not Found Dialog ── */}
      <Dialog
        open={notFoundDialog}
        onClose={() => setNotFoundDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <PersonSearchIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Patient Not Found</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>No matching record in the system</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Alert severity="warning" icon={false} sx={{ borderRadius: 2, border: '1px solid #fde68a', background: '#fffbeb', mb: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#92400e', mb: 0.5 }}>
              No patient matches your search.
            </Typography>
            <Typography variant="body2" sx={{ color: '#b45309' }}>
              To schedule an appointment, the patient must first be registered in the system.
              Please go to the <strong>"New Patient & Appointment"</strong> tab to register them, then book the appointment.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="contained" onClick={() => setNotFoundDialog(false)} sx={{ borderRadius: 2 }}>
            OK, Got It
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Existing Patient Info Dialog ── */}
      <Dialog
        open={existingPatientDialog.open}
        onClose={() => setExistingPatientDialog({ open: false, patient: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <PersonSearchIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Patient Found</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>Existing record in the system</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Alert severity="success" icon={false} sx={{ borderRadius: 2, border: '1px solid #bbf7d0', background: '#f0fdf4', mb: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#166534', mb: 0.5 }}>
              This patient is already in our records.
            </Typography>
            <Typography variant="body2" sx={{ color: '#15803d' }}>
              You can proceed to book the appointment below, or visit the patient's detail page to log a new visit directly.
            </Typography>
          </Alert>
          {existingPatientDialog.patient && (
            <Box sx={{ background: '#f8fafc', borderRadius: 2, p: 2, border: '1px solid #e2e8f0' }}>
              <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                Registered Patient
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5 }}>
                {existingPatientDialog.patient.full_name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6366F1', fontFamily: 'monospace', mt: 0.25 }}>
                ID: {existingPatientDialog.patient.patient_id}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.25 }}>
                📱 {existingPatientDialog.patient.whatsapp}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setExistingPatientDialog({ open: false, patient: null })}
            sx={{ borderRadius: 2 }}
          >
            Book Appointment
          </Button>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={() => {
              setExistingPatientDialog({ open: false, patient: null })
              navigate(`/admin/patients/${existingPatientDialog.patient.patient_id}`)
            }}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #6366F1 0%, #4f46e5 100%)',
              fontWeight: 700,
              '&:hover': { background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' }
            }}
          >
            Go to Patient Record
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
