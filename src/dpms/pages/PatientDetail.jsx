import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Paper, Typography, Grid, Box, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, MenuItem, Tabs, Tab, Alert, CircularProgress,
  Chip, Divider, ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow
} from '@mui/material'
import { CameraAlt as CameraAltIcon } from '@mui/icons-material'
import { Videocam as VideocamIcon } from '@mui/icons-material'
import { MedicalServices as MedicalServicesIcon } from '@mui/icons-material'
import { LocalShipping as LocalShippingIcon } from '@mui/icons-material'
import { Payment as PaymentIcon } from '@mui/icons-material'
import api from '@/dpms/api'
import dayjs from 'dayjs'
import { useAuth } from '@/dpms/auth/AuthProvider'
import MedicinesSelector from '@/dpms/components/MedicinesSelector'
import MedicinesPanel from '@/dpms/components/MedicinesPanel'
import BloodTestSelector from '@/dpms/components/BloodTestSelector'
import { uploadCloudinaryMedia } from '@/dpms/utils/cloudinaryUpload'

const TREATMENTS = [
  'Cupping',
  'PRP',
  'GFC',
  'Mesotherapy',
  'Biotin',
  'Other'
]

const ADVICE_OPTIONS = [
  'use RO water for head wash',
  'eat Diet',
  'head stand',
  'avoid junk food',
  'ensure good sleep',
  'use sulfate-free shampoo',
  'manage stress',
  'increase protein intake'
]

const HISTORY_OPTIONS = [
  'Alopecia Areata',
  'PCOS',
  'Thyroid Disorder',
  'Telogen Effluvium',
  'Nutritional Deficiencies (Iron/Biotin/Zinc)',
  'Family History of Hair Loss',
  'Androgenetic Alopecia',
  'Traction Alopecia',
  'Dandruff / Seborrheic Dermatitis',
  'Scalp Psoriasis'
]

function TabPanel(props) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  )
}

export default function PatientDetail() {
  const { patient_id } = useParams()
  const location = useLocation()
  const [patient, setPatient] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [activeAppointment, setActiveAppointment] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [tabValue, setTabValue] = useState(0)
  const [compare, setCompare] = useState({ a: null, b: null })
  const [videoCompare, setVideoCompare] = useState({ a: null, b: null })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [consultationType, setConsultationType] = useState('offline')
  const [newVisit, setNewVisit] = useState({
    date_of_visit: '', doctor_notes: '', doctor_advice: '', treatment: '',
    photos: [], videos: [], payment_datetime: '', amount_paid: '', dispatch_date: '', tracking_id: '',
    blood_tests: []
  })
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedMedicines, setSelectedMedicines] = useState([])
  const [medicinesPanelOpen, setMedicinesPanelOpen] = useState(false)
  const [otherTreatmentDialogOpen, setOtherTreatmentDialogOpen] = useState(false)
  const [otherTreatment, setOtherTreatment] = useState('')
  // Dispatch update dialog
  const [dispatchDialog, setDispatchDialog] = useState({ open: false, visitId: null, dispatch_date: '', tracking_id: '' })
  const [dispatchSaving, setDispatchSaving] = useState(false)
  const [lightbox, setLightbox] = useState({ open: false, src: '' })
  const auth = useAuth()
  const nav = useNavigate()

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

  const loadPatient = async () => {
    try {
      const res = await api.get(`/api/patients/${patient_id}`)
      if (!location.state?.startConsultation) {
        setConsultationType(res.data.patient_type || 'offline')
      }
      setPatient({
        ...res.data,
        medical_history: res.data.current_issues
          ? (res.data.medical_history ? `${res.data.medical_history}\n\nCurrent Issues: ${res.data.current_issues}` : `Current Issues: ${res.data.current_issues}`)
          : res.data.medical_history
      })
      setForm({
        full_name: res.data.full_name,
        age: res.data.age,
        gender: res.data.gender,
        whatsapp: res.data.whatsapp,
        medical_history: res.data.current_issues ? (res.data.medical_history ? `${res.data.medical_history}\n\nCurrent Issues: ${res.data.current_issues}` : res.data.current_issues) : res.data.medical_history,
        email: res.data.email,
        address: res.data.address || ''
      })
    } catch (e) {
      console.error(e)
    }
  }

  const loadAppointments = async () => {
    try {
      const res = await api.get(`/api/appointments?patient_id=${patient_id}&per_page=100`)
      setAppointments(res.data.items || [])
    } catch (e) {}
  }

  useEffect(() => { 
    loadPatient()
    loadAppointments()
  }, [patient_id])

  useEffect(() => {
    if (location.state?.startConsultation && location.state?.appointment) {
      const appt = location.state.appointment;
      setActiveAppointment(appt);
      setTabValue(1);
      
      const formatDateTime = (dt) => {
        if (!dt || dt === 'Pending') return '';
        try { return dayjs(dt).format('YYYY-MM-DDTHH:mm'); } catch { return ''; }
      }
      
      const treatmentType = appt.consultation_type === 'walk_in' ? 'Clinic Visit' : 'Online Consultation';
      if (!TREATMENTS.includes(treatmentType)) {
        setOtherTreatment(treatmentType); // We can just set it as a custom string
      }
      
      setConsultationType(appt.consultation_type === 'walk_in' ? 'offline' : 'online');

      setNewVisit(prev => ({
        ...prev,
        date_of_visit: formatDateTime(appt.date_time),
        treatment: treatmentType
      }));
      
      setSuccessMessage('Auto-filled consultation details from Website Appointment.');
      // Clear state so it doesn't prefill again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state])

  const save = async () => {
    try {
      await api.put(`/api/patients/${patient_id}`, form)
      setEditing(false)
      loadPatient()
    } catch (e) { alert('Save failed') }
  }

  const emptyNewVisit = {
    date_of_visit: '', doctor_notes: '', doctor_advice: '', treatment: '',
    photos: [], videos: [], payment_datetime: '', amount_paid: '', dispatch_date: '', tracking_id: '',
    blood_tests: []
  }

  const handleMediaFile = async (e, mediaType) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return

    if (mediaType === 'photo' && !file.type.startsWith('image/')) {
      alert('Please select an image file.')
      return
    }
    if (mediaType === 'video' && !file.type.startsWith('video/')) {
      alert('Please select a video file.')
      return
    }

    setUploading(true)
    try {
      const uploaded = await uploadCloudinaryMedia(file)
      if (mediaType === 'video') {
        setNewVisit((v) => ({ ...v, videos: [...(v.videos || []), uploaded.url] }))
        alert('Video uploaded successfully')
      } else {
        setNewVisit((v) => ({ ...v, photos: [...v.photos, uploaded.url] }))
        alert('Photo uploaded successfully')
      }
    } catch (err) {
      console.error(err)
      alert(err.message || 'Upload error')
    } finally {
      setUploading(false)
    }
  }

  const submitVisit = async () => {
    try {
      if (!newVisit.treatment) {
        alert('Please select a treatment')
        return
      }
      // For online patients, validate payment fields
      if (consultationType === 'online' && (!newVisit.payment_datetime || !newVisit.amount_paid)) {
        alert('Payment Date/Time and Amount Paid are required for online orders.')
        return
      }
      setSubmitting(true)
      const payload = { visit: { ...newVisit, medicines: selectedMedicines } }
      await api.put(`/api/patients/${patient_id}`, payload)
      
      if (activeAppointment) {
        try {
          await api.put(`/api/appointments/${activeAppointment._id}`, { status: 'Completed' })
          setActiveAppointment(null)
          loadAppointments()
        } catch (e) {}
      }

      // ── Fire post-visit notification (thank you + next visit date) ──
      try {
        await api.post('/api/notify/post-visit', {
          phone:      patient?.whatsapp || '',
          email:      patient?.email    || null,
          name:       patient?.full_name || '',
          treatment:  newVisit.treatment,
          next_visit: newVisit.next_visit || null,
        })
      } catch (notifyErr) {
        console.warn('Post-visit notification failed (non-critical):', notifyErr)
      }

      setSuccessMessage('Visit added successfully! Confirmation sent to patient.')
      setNewVisit(emptyNewVisit)
      setSelectedMedicines([])
      setTimeout(() => {
        loadPatient()
        setTabValue(0)
        setSuccessMessage('')
      }, 2000)
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to add visit')
    } finally {
      setSubmitting(false)
    }
  }


  const removePhotoFromNewVisit = (idx) => {
    setNewVisit(v => ({ ...v, photos: v.photos.filter((_, i) => i !== idx) }))
  }

  const removeVideoFromNewVisit = (idx) => {
    setNewVisit(v => ({ ...v, videos: (v.videos || []).filter((_, i) => i !== idx) }))
  }

  const remove = async () => {
    try {
      await api.delete(`/api/patients/${patient_id}`)
      nav('/')
    } catch (e) { alert('Delete failed') }
  }

  const saveDispatch = async () => {
    try {
      setDispatchSaving(true)
      await api.patch(`/api/patients/${patient_id}/visit-dispatch`, {
        visit_id: dispatchDialog.visitId,
        dispatch_date: dispatchDialog.dispatch_date,
        tracking_id: dispatchDialog.tracking_id,
      })
      setDispatchDialog({ open: false, visitId: null, dispatch_date: '', tracking_id: '' })
      loadPatient()
    } catch (e) {
      alert(e.response?.data?.msg || 'Failed to update dispatch info')
    } finally {
      setDispatchSaving(false)
    }
  }

  const exportPdf = async () => {
    window.print()
  }

  const visits = (patient && patient.visits) ? [...patient.visits].sort((a, b) => new Date(b.date_of_visit) - new Date(a.date_of_visit)) : []
  const videoCompareOptions = [
    ...visits.flatMap((visit, visitIndex) => (visit.videos || []).map((src, videoIndex) => ({
      key: `visit:${visitIndex}:${videoIndex}`,
      src,
      visit,
      label: `${dayjs(visit.date_of_visit).format('DD MMM YYYY')} - ${visit.treatment || 'Visit'}${(visit.videos || []).length > 1 ? ` - Video ${videoIndex + 1}` : ''}`,
    }))),
    ...(newVisit.videos || []).map((src, videoIndex) => ({
      key: `draft:${videoIndex}`,
      src,
      visit: {
        ...newVisit,
        date_of_visit: newVisit.date_of_visit || new Date().toISOString(),
        treatment: newVisit.treatment || 'Current consultation draft',
      },
      label: `Current consultation draft${newVisit.videos.length > 1 ? ` - Video ${videoIndex + 1}` : ''}`,
    })),
  ]

  return (
    <div>
      <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">Patient: {patient_id}</Typography>
        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={exportPdf} sx={{ mr: 1 }}>Export PDF</Button>
          {auth?.user?.role === 'Admin' && (
            <>
              <Button variant="contained" color="info" onClick={() => setMedicinesPanelOpen(true)}>Manage Medicines</Button>
              <Button color="error" onClick={() => setConfirmDelete(true)}>Delete</Button>
            </>
          )}
        </Box>
      </Box>

      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

      <Paper>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="History & Details" />
          <Tab label="New Consultation" />
          <Tab label="Appointments" />
        </Tabs>

        {/* Tab 1: History & Details */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6">Details</Typography>
                {!editing ? (
                  <Box>
                    <Typography><strong>Name:</strong> {patient?.full_name}</Typography>
                    <Typography><strong>Age:</strong> {patient?.age || ''}</Typography>
                    <Typography><strong>Gender:</strong> {patient?.gender || ''}</Typography>
                    <Typography><strong>WhatsApp:</strong> {patient?.whatsapp || ''}</Typography>
                    <Typography><strong>Email:</strong> {patient?.email || ''}</Typography>
                    <Typography><strong>Address:</strong> {patient?.address || <em style={{ color: '#94a3b8' }}>Not provided</em>}</Typography>
                    <Typography><strong>Next Visit:</strong> {patient?.next_visit ? dayjs(patient.next_visit).format('DD MMM YYYY, h:mm A') : ''}</Typography>
                    <Box mt={1}><Button onClick={() => setEditing(true)}>Edit</Button></Box>
                  </Box>
                ) : (
                  <Box display="flex" flexDirection="column" gap={1}>
                    <TextField label="Full name" value={form.full_name || ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                    <TextField label="Age" value={form.age || ''} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                    <TextField label="Gender" value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })} />
                    <TextField label="WhatsApp" value={form.whatsapp || ''} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                    <TextField label="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    <TextField label="Address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} multiline rows={2} placeholder="House no., Street, Area, City, State, Pincode" />
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1, mt: 1 }}>Common Conditions:</Typography>
                      <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                        {HISTORY_OPTIONS.map((hist, idx) => (
                          <Chip 
                            key={idx} 
                            label={hist} 
                            onClick={() => setForm({...form, medical_history: form.medical_history ? `${form.medical_history}, ${hist}` : hist})} 
                            color="secondary" 
                            variant="outlined" 
                            clickable
                            size="small"
                          />
                        ))}
                      </Box>
                      <TextField label="Complete Medical History & Current Issues" value={form.medical_history || ''} onChange={(e) => setForm({ ...form, medical_history: e.target.value })} multiline rows={3} fullWidth />
                    </Box>
                    <Box mt={1}>
                      <Button onClick={save} variant="contained" sx={{ mr: 1 }}>Save</Button>
                      <Button onClick={() => setEditing(false)}>Cancel</Button>
                    </Box>
                  </Box>
                )}
              </Paper>
              <Box mt={2}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6">Previous Visits History</Typography>
                  <Box mt={1}>
                    {visits.length <= 1 ? (
                      <Typography variant="body2" sx={{ color: 'gray' }}>No previous visits recorded yet</Typography>
                    ) : (
                      visits.slice(0, visits.length - 1).map((v, idx) => (
                        <Box key={idx} sx={{ mb: 2, pb: 1, borderBottom: idx < visits.length - 2 ? '1px solid #eee' : 'none' }}>
                          <Typography><strong>{dayjs(v.date_of_visit).format('DD MMM YYYY, h:mm A')}</strong></Typography>
                          <Typography variant="body2" sx={{ color: 'primary.main' }}>{v.treatment}</Typography>
                          {v.doctor_notes && <Typography variant="body2"><strong>Notes:</strong> {v.doctor_notes}</Typography>}
                          {v.doctor_advice && <Typography variant="body2"><strong>Advice:</strong> {v.doctor_advice}</Typography>}
                          {v.next_visit && <Typography variant="body2" sx={{ color: 'orange' }}><strong>Next Scheduled:</strong> {dayjs(v.next_visit).format('DD MMM YYYY')}</Typography>}
                          {/* Online order info */}
                          {patient?.patient_type === 'online' && (
                            <OnlineVisitInfo v={v} onUpdateDispatch={() => setDispatchDialog({ open: true, visitId: v.visit_id, dispatch_date: v.dispatch_date || '', tracking_id: v.tracking_id || '' })} />
                          )}
                          {/* Blood tests */}
                          {(v.blood_tests || []).length > 0 && (
                            <BloodTestBadges tests={v.blood_tests} />
                          )}
                          {/* Photos */}
                          {(v.photos || []).length > 0 && (
                            <VisitPhotos photos={v.photos} onExpand={(src) => setLightbox({ open: true, src })} />
                          )}
                          {(v.videos || []).length > 0 && (
                            <VisitVideos videos={v.videos} />
                          )}
                          {(v.medicines || []).length > 0 && (
                            <Box mt={2} sx={{ backgroundColor: '#f9f9f9', p: 1.5, borderRadius: 1, border: '2px solid #2196F3' }}>
                              <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#2196F3' }}>💊 Medicines & Billing</Typography>
                              </Box>
                              <Box display="flex" flexDirection="column" gap={0.5}>
                                {v.medicines.map((m, i) => (
                                  <Box key={i} display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2">{m.name}</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2196F3' }}>₹{m.price.toFixed(2)}</Typography>
                                  </Box>
                                ))}
                              </Box>
                              <Box display="flex" justifyContent="space-between" sx={{ borderTop: '2px solid #ddd', pt: 1, mt: 1 }}>
                                <Typography variant="subtitle2"><strong>Total Bill:</strong></Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#4CAF50', fontSize: '1.1em' }}>
                                  ₹{v.medicines.reduce((sum, m) => sum + m.price, 0).toFixed(2)}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                        </Box>
                      ))
                    )}
                  </Box>
                </Paper>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              {/* Visit History Timeline */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">Visit History (Latest)</Typography>
                {visits.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'gray' }}>No visits recorded yet</Typography>
                ) : (
                  [visits[visits.length - 1]].map((v, idx) => (
                    <Box key={idx} sx={{ py: 2 }}>
                      <Typography><strong>{dayjs(v.date_of_visit).format('DD MMM YYYY, h:mm A')}</strong></Typography>
                      <Typography variant="body2" sx={{ color: 'primary.main' }}>{v.treatment}</Typography>
                      {v.doctor_notes && <Typography variant="body2"><strong>Notes:</strong> {v.doctor_notes}</Typography>}
                      {v.doctor_advice && <Typography variant="body2"><strong>Advice:</strong> {v.doctor_advice}</Typography>}
                      {v.next_visit && <Typography variant="body2" sx={{ color: 'orange' }}><strong>Next Scheduled:</strong> {dayjs(v.next_visit).format('DD MMM YYYY')}</Typography>}
                      {/* Online order info */}
                      {patient?.patient_type === 'online' && (
                        <OnlineVisitInfo v={v} onUpdateDispatch={() => setDispatchDialog({ open: true, visitId: v.visit_id, dispatch_date: v.dispatch_date || '', tracking_id: v.tracking_id || '' })} />
                      )}
                      {/* Blood tests */}
                      {(v.blood_tests || []).length > 0 && (
                        <BloodTestBadges tests={v.blood_tests} />
                      )}
                      {/* Photos */}
                      {(v.photos || []).length > 0 && (
                        <VisitPhotos photos={v.photos} onExpand={(src) => setLightbox({ open: true, src })} />
                      )}
                      {(v.videos || []).length > 0 && (
                        <VisitVideos videos={v.videos} />
                      )}
                      {(v.medicines || []).length > 0 && (
                        <Box mt={2} sx={{ backgroundColor: '#f9f9f9', p: 1.5, borderRadius: 1, border: '2px solid #2196F3' }}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#2196F3' }}>💊 Medicines & Billing</Typography>
                          </Box>
                          <Box display="flex" flexDirection="column" gap={0.5}>
                            {v.medicines.map((m, i) => (
                              <Box key={i} display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2">{m.name}</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2196F3' }}>₹{m.price.toFixed(2)}</Typography>
                              </Box>
                            ))}
                          </Box>
                          <Box display="flex" justifyContent="space-between" sx={{ borderTop: '2px solid #ddd', pt: 1, mt: 1 }}>
                            <Typography variant="subtitle2"><strong>Total Bill:</strong></Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#4CAF50', fontSize: '1.1em' }}>
                              ₹{v.medicines.reduce((sum, m) => sum + m.price, 0).toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  ))
                )}
              </Paper>

              {/* Before/After Comparison */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Before / After Comparison</Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>Select two visits with photos or videos to compare</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Photo Comparison</Typography>
                <Box display="flex" gap={1} mb={2}>
                  <TextField select label="Before (Visit A)" value={compare.a !== null ? compare.a : ''} onChange={(e) => setCompare(c => ({ ...c, a: e.target.value }))} size="small" sx={{ flex: 1 }}>
                    <MenuItem value="">Select Visit</MenuItem>
                    {visits.map((v, i) => (
                      <MenuItem key={i} value={i}>
                        {dayjs(v.date_of_visit).format('DD MMM YYYY')} — {v.treatment}
                        {(v.photos || []).length > 0 ? ' 📷' : ' (no photo)'}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField select label="After (Visit B)" value={compare.b !== null ? compare.b : ''} onChange={(e) => setCompare(c => ({ ...c, b: e.target.value }))} size="small" sx={{ flex: 1 }}>
                    <MenuItem value="">Select Visit</MenuItem>
                    {visits.map((v, i) => (
                      <MenuItem key={i} value={i}>
                        {dayjs(v.date_of_visit).format('DD MMM YYYY')} — {v.treatment}
                        {(v.photos || []).length > 0 ? ' 📷' : ' (no photo)'}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <CompareImages visits={visits} a={compare.a} b={compare.b} onExpand={(src) => setLightbox({ open: true, src })} />

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Video Comparison</Typography>
                <Box display="flex" gap={1} mb={2}>
                  <TextField select label="Video A" value={videoCompare.a !== null ? videoCompare.a : ''} onChange={(e) => setVideoCompare(c => ({ ...c, a: e.target.value }))} size="small" sx={{ flex: 1 }}>
                    <MenuItem value="">Select Visit</MenuItem>
                    {videoCompareOptions.map(({ key, label }) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField select label="Video B" value={videoCompare.b !== null ? videoCompare.b : ''} onChange={(e) => setVideoCompare(c => ({ ...c, b: e.target.value }))} size="small" sx={{ flex: 1 }}>
                    <MenuItem value="">Select Visit</MenuItem>
                    {videoCompareOptions.map(({ key, label }) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <CompareVideos options={videoCompareOptions} a={videoCompare.a} b={videoCompare.b} />
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 2: New Consultation */}
        <TabPanel value={tabValue} index={1}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Add New Consultation for {patient?.full_name}</Typography>
            <Box mb={2}>
              <ToggleButtonGroup
                value={consultationType}
                exclusive
                onChange={(e, val) => { if (val) setConsultationType(val) }}
                size="small"
                color="primary"
              >
                <ToggleButton value="offline">Clinic Visit</ToggleButton>
                <ToggleButton value="online">Online Consultation</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField label="Date of Visit" type="datetime-local" value={newVisit.date_of_visit} onChange={(e) => setNewVisit({ ...newVisit, date_of_visit: handleDateChange(e.target.value) })} InputLabelProps={{ shrink: true }} inputProps={{ step: 1800 }} fullWidth sx={{ mb: 2 }} />

              {/* Online payment fields for new consultation */}
              {consultationType === 'online' && (
                <Box sx={{ background: 'linear-gradient(135deg, #f0fdfe, #e0f7fa)', border: '1.5px solid #a5f3fc', borderRadius: 2, p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#0891b2', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PaymentIcon fontSize="small" /> Order & Payment Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Payment Date & Time *" type="datetime-local" value={newVisit.payment_datetime || ''} onChange={(e) => setNewVisit({ ...newVisit, payment_datetime: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Amount Paid (₹) *" type="number" value={newVisit.amount_paid || ''} onChange={(e) => setNewVisit({ ...newVisit, amount_paid: e.target.value })} fullWidth required inputProps={{ min: 0, step: '0.01' }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Dispatch Date (optional)" type="date" value={newVisit.dispatch_date || ''} onChange={(e) => setNewVisit({ ...newVisit, dispatch_date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth helperText="Fill when order is shipped" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Tracking ID (optional)" value={newVisit.tracking_id || ''} onChange={(e) => setNewVisit({ ...newVisit, tracking_id: e.target.value })} fullWidth placeholder="e.g. DTDC123456789IN" helperText="Fill when order is shipped" />
                    </Grid>
                  </Grid>
                </Box>
              )}
              <Box mb={2}>
                <TextField select label="Treatment Type" value={TREATMENTS.includes(newVisit.treatment) ? newVisit.treatment : (newVisit.treatment ? 'Other' : '')} onChange={(e) => {
                  if (e.target.value === 'Other') {
                    setOtherTreatmentDialogOpen(true)
                  } else {
                    setNewVisit({ ...newVisit, treatment: e.target.value })
                  }
                }} fullWidth>
                  <MenuItem value="">Select Treatment</MenuItem>
                  {TREATMENTS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                {newVisit.treatment && !TREATMENTS.includes(newVisit.treatment) && (
                  <Typography variant="caption" color="primary">Custom: {newVisit.treatment}</Typography>
                )}
              </Box>
              <TextField label="Doctor Notes" value={newVisit.doctor_notes} onChange={(e) => setNewVisit({ ...newVisit, doctor_notes: e.target.value })} multiline rows={2} fullWidth sx={{ mb: 2 }} />
              
              <Box>
                <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                  {ADVICE_OPTIONS.map((adv, idx) => (
                    <Chip 
                      key={idx} 
                      label={adv} 
                      onClick={() => setNewVisit({...newVisit, doctor_advice: newVisit.doctor_advice ? `${newVisit.doctor_advice}, ${adv}` : adv})} 
                      color="primary" 
                      variant="outlined" 
                      clickable
                      size="small"
                    />
                  ))}
                </Box>
                <TextField label="Doctor Advice" value={newVisit.doctor_advice} onChange={(e) => setNewVisit({ ...newVisit, doctor_advice: e.target.value })} multiline rows={2} fullWidth sx={{ mb: 2 }} />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                <Button variant="outlined" component="label" startIcon={<CameraAltIcon />} disabled={uploading}>
                  UPLOAD PHOTO
                  <input type="file" hidden accept="image/*" onChange={(e) => handleMediaFile(e, 'photo')} />
                </Button>
                <Button variant="outlined" component="label" startIcon={<VideocamIcon />} disabled={uploading}>
                  UPLOAD VIDEO
                  <input type="file" hidden accept="video/*" onChange={(e) => handleMediaFile(e, 'video')} />
                </Button>
                {uploading && <CircularProgress size={20} sx={{ ml: 1 }} />}
                </Box>
              </Box>


              {newVisit.photos.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Uploaded Photos:</Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {newVisit.photos.map((u, i) => (
                      <Box key={i} sx={{ position: 'relative' }}>
                        <img src={u} alt={`photo-${i}`} style={{ height: 100, borderRadius: 4, border: '1px solid #ccc' }} />
                        <Button size="small" color="error" onClick={() => removePhotoFromNewVisit(i)} sx={{ position: 'absolute', top: -8, right: -8, minWidth: 'auto', width: 24, height: 24 }}>✕</Button>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              {(newVisit.videos || []).length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Uploaded Videos:</Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {newVisit.videos.map((u, i) => (
                      <Box key={i} sx={{ position: 'relative', width: 180, height: 110, borderRadius: 1, overflow: 'hidden', border: '1px solid #ccc', background: '#0f172a' }}>
                        <video src={u} controls muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <Button size="small" color="error" onClick={() => removeVideoFromNewVisit(i)} sx={{ position: 'absolute', top: -8, right: -8, minWidth: 'auto', width: 24, height: 24, background: '#fff' }}>âœ•</Button>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              {/* Blood Test Prescriptions — offline patients */}
              {consultationType !== 'online' && (
                <Box mt={2} mb={1}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Box sx={{ width: 28, height: 28, borderRadius: 1, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 14 }}>🧪</span>
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>Blood Test Prescriptions</Typography>
                  </Box>
                  <BloodTestSelector
                    selectedTests={newVisit.blood_tests || []}
                    onTestsChange={(tests) => setNewVisit({ ...newVisit, blood_tests: tests })}
                  />
                </Box>
              )}

              <Box mt={3} pt={2} sx={{ borderTop: '1px solid #f0f0f0' }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <MedicalServicesIcon sx={{ color: '#1d4ed8' }} />
                  <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 'bold' }}>Medicines & Billing</Typography>
                </Box>
                <MedicinesSelector selectedMedicines={selectedMedicines} onMedicinesChange={setSelectedMedicines} />
              </Box>

              <Box display="flex" gap={1} mt={2}>
                <Button variant="contained" onClick={submitVisit} disabled={submitting || !newVisit.treatment}>
                  {submitting ? 'Saving...' : 'Save Consultation'}
                </Button>
                <Button variant="outlined" onClick={() => { setNewVisit(emptyNewVisit); setSelectedMedicines([]) }}>Reset</Button>
              </Box>
            </Box>
          </Paper>
        </TabPanel>

        {/* Tab 2: Appointments */}
        <TabPanel value={tabValue} index={2}>
          <Paper sx={{ p: 0, overflow: 'hidden' }}>
            <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
              Appointment History
            </Typography>
            {appointments.length === 0 ? (
              <Box p={4} textAlign="center" color="text.secondary">
                No appointments found for this patient.
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Treatment</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {appointments.map((appt) => (
                      <TableRow key={appt._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {appt.date_time !== 'Pending' ? dayjs(appt.date_time).format('DD MMM YYYY') : 'Pending'}
                          </Typography>
                          {appt.date_time !== 'Pending' && (
                            <Typography variant="caption" color="text.secondary">
                              {dayjs(appt.date_time).format('h:mm A')}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {appt.consultation_type === 'walk_in' ? 'Clinic Visit' : 'Online'}
                        </TableCell>
                        <TableCell>{appt.treatment}</TableCell>
                        <TableCell>
                          <Chip 
                            label={appt.status || 'New'} 
                            size="small" 
                            color={
                              appt.status === 'Completed' ? 'success' :
                              appt.status === 'Cancelled' ? 'error' :
                              appt.status === 'No Show' ? 'warning' :
                              appt.status === 'Consultation Started' ? 'info' : 'default'
                            }
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button 
                            variant="outlined" 
                            color="primary"
                            size="small" 
                            onClick={async () => {
                              try {
                                if (appt.status !== 'Consultation Started') {
                                  await api.put(`/api/appointments/${appt._id}`, { status: 'Consultation Started' })
                                  loadAppointments()
                                }
                                setActiveAppointment(appt)
                                setTabValue(1)
                                
                                const treatmentType = appt.consultation_type === 'walk_in' ? 'Clinic Visit' : 'Online Consultation';
                                setConsultationType(appt.consultation_type === 'walk_in' ? 'offline' : 'online');
                                setNewVisit(prev => ({
                                  ...prev,
                                  date_of_visit: appt.date_time !== 'Pending' ? dayjs(appt.date_time).format('YYYY-MM-DDTHH:mm') : '',
                                  treatment: treatmentType
                                }));
                              } catch(e){}
                            }}
                            sx={{ textTransform: 'none', borderRadius: 1.5 }}
                          >
                            Start Consultation
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </TabPanel>
      </Paper>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete this patient? This action cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button color="error" onClick={remove}>Delete</Button>
        </DialogActions>
      </Dialog>

      <MedicinesPanel open={medicinesPanelOpen} onClose={() => setMedicinesPanelOpen(false)} />

      {/* Dispatch Update Dialog */}
      <Dialog open={dispatchDialog.open} onClose={() => setDispatchDialog({ open: false, visitId: null, dispatch_date: '', tracking_id: '' })} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, background: 'linear-gradient(135deg, #06b6d4, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LocalShippingIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Update Dispatch Info</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>Fill in when order is shipped</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Dispatch Date"
            type="date"
            value={dispatchDialog.dispatch_date}
            onChange={(e) => setDispatchDialog(d => ({ ...d, dispatch_date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Tracking ID"
            value={dispatchDialog.tracking_id}
            onChange={(e) => setDispatchDialog(d => ({ ...d, tracking_id: e.target.value }))}
            fullWidth
            placeholder="e.g. DTDC123456789IN"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDispatchDialog({ open: false, visitId: null, dispatch_date: '', tracking_id: '' })}>Cancel</Button>
          <Button variant="contained" onClick={saveDispatch} disabled={dispatchSaving}
            sx={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', fontWeight: 700 }}>
            {dispatchSaving ? 'Saving...' : 'Save Dispatch Info'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={otherTreatmentDialogOpen} onClose={() => setOtherTreatmentDialogOpen(false)}>
        <DialogTitle>Specify Custom Treatment</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Treatment Name" fullWidth value={otherTreatment} onChange={(e) => setOtherTreatment(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOtherTreatmentDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            setNewVisit({ ...newVisit, treatment: otherTreatment })
            setOtherTreatmentDialogOpen(false)
          }} variant="contained">OK</Button>
        </DialogActions>
      </Dialog>
      {/* Lightbox dialog */}
      <Dialog open={lightbox.open} onClose={() => setLightbox({ open: false, src: '' })} maxWidth="lg" fullWidth
        PaperProps={{ sx: { background: '#000', borderRadius: 3 } }}>
        <DialogActions sx={{ justifyContent: 'flex-end', p: 1 }}>
          <Button onClick={() => setLightbox({ open: false, src: '' })} sx={{ color: '#fff', minWidth: 0 }}>✕ Close</Button>
        </DialogActions>
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 2, px: 2 }}>
          <img src={lightbox.src} alt="full view" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8, objectFit: 'contain' }} />
        </Box>
      </Dialog>
    </div>
  )
}


function VisitPhotos({ photos, onExpand }) {
  const [errors, setErrors] = useState({})
  if (!photos || photos.length === 0) return null

  // Ensure old photos without f_auto get the transformation so HEIC renders
  const formattedPhotos = photos.map(url => 
    url.includes('f_auto') ? url : url.replace('/upload/', '/upload/f_auto,q_auto/')
  )

  return (
    <Box mt={1.5}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        📷 Photos ({photos.length})
      </Typography>
      <Box display="flex" gap={1.5} flexWrap="wrap" mt={0.75}>
        {formattedPhotos.map((url, i) => (
          <Box
            key={i}
            onClick={() => !errors[i] && onExpand(url)}
            sx={{
              position: 'relative',
              cursor: errors[i] ? 'default' : 'zoom-in',
              borderRadius: 2,
              overflow: 'hidden',
              border: '2px solid #e2e8f0',
              '&:hover': { borderColor: '#6366f1', boxShadow: '0 4px 12px rgba(99,102,241,0.2)' },
              transition: 'all 0.2s',
              width: 140, height: 140,
              background: '#f8fafc',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {errors[i] ? (
              <Box textAlign="center" p={1}>
                <Typography fontSize={28}>🖼️</Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>Image unavailable</Typography>
              </Box>
            ) : (
              <>
                <img
                  src={url}
                  alt={`photo ${i + 1}`}
                  onError={() => setErrors(e => ({ ...e, [i]: true }))}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <Box sx={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
                  py: 0.5, textAlign: 'center',
                }}>
                  <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.65rem' }}>
                    Click to expand
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function VisitVideos({ videos }) {
  if (!videos || videos.length === 0) return null

  return (
    <Box mt={1.5}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Videos ({videos.length})
      </Typography>
      <Box display="flex" gap={1.5} flexWrap="wrap" mt={0.75}>
        {videos.map((url, i) => (
          <Box
            key={i}
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              border: '2px solid #e2e8f0',
              width: 220,
              maxWidth: '100%',
              background: '#0f172a',
            }}
          >
            <video
              src={url}
              controls
              preload="metadata"
              style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function CompareImages({ visits, a, b, onExpand }) {
  const [errA, setErrA] = useState(false)
  const [errB, setErrB] = useState(false)

  if (a === '' || b === '' || a == null || b == null) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>
        <Typography fontSize={36}>🔍</Typography>
        <Typography variant="body2">Select two visits above to compare their photos</Typography>
      </Box>
    )
  }
  const va = visits[parseInt(a)]
  const vb = visits[parseInt(b)]
  let ima = va?.photos?.[0]
  let imb = vb?.photos?.[0]

  // Ensure old photos without f_auto get the transformation so HEIC renders
  if (ima && !ima.includes('f_auto')) ima = ima.replace('/upload/', '/upload/f_auto,q_auto/')
  if (imb && !imb.includes('f_auto')) imb = imb.replace('/upload/', '/upload/f_auto,q_auto/')

  if (!ima && !imb) return (
    <Box sx={{ textAlign: 'center', py: 3, color: '#94a3b8' }}>
      <Typography variant="body2">Neither selected visit has photos</Typography>
    </Box>
  )

  const PhotoSide = ({ visit, img, label, err, onErr }) => (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{
        background: label === 'BEFORE' ? '#fef2f2' : '#f0fdf4',
        borderRadius: '8px 8px 0 0', px: 1.5, py: 0.75,
        borderBottom: `3px solid ${label === 'BEFORE' ? '#ef4444' : '#22c55e'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <Typography variant="caption" sx={{
          fontWeight: 800, letterSpacing: 1,
          color: label === 'BEFORE' ? '#dc2626' : '#16a34a'
        }}>{label}</Typography>
        <Typography variant="caption" sx={{ color: '#64748b' }}>
          {dayjs(visit.date_of_visit).format('DD MMM YYYY')}
        </Typography>
      </Box>
      <Box sx={{
        background: '#0f172a', borderRadius: '0 0 8px 8px',
        overflow: 'hidden', minHeight: 220,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: img && !err ? 'zoom-in' : 'default'
      }} onClick={() => img && !err && onExpand(img)}>
        {!img ? (
          <Box textAlign="center" p={2}>
            <Typography fontSize={32}>📷</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>No photo for this visit</Typography>
          </Box>
        ) : err ? (
          <Box textAlign="center" p={2}>
            <Typography fontSize={32}>🖼️</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>Image unavailable</Typography>
          </Box>
        ) : (
          <img
            src={img}
            alt={label}
            onError={onErr}
            style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }}
          />
        )}
      </Box>
      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5, px: 0.5 }}>
        {visit.treatment}
      </Typography>
    </Box>
  )

  return (
    <Box>
      <Box display="flex" gap={2} mt={1}>
        <PhotoSide visit={va} img={ima} label="BEFORE" err={errA} onErr={() => setErrA(true)} />
        <Box display="flex" alignItems="center" sx={{ color: '#94a3b8', fontSize: 24, userSelect: 'none', flexShrink: 0 }}>→</Box>
        <PhotoSide visit={vb} img={imb} label="AFTER" err={errB} onErr={() => setErrB(true)} />
      </Box>
      {(ima && imb && !errA && !errB) && (
        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', textAlign: 'center', mt: 1 }}>
          💡 Click either image to view full size
        </Typography>
      )}
    </Box>
  )
}

function CompareVideos({ options, a, b }) {
  if (!options || options.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3, color: '#94a3b8' }}>
        <Typography variant="body2">No visit videos are available yet</Typography>
      </Box>
    )
  }

  if (a === '' || b === '' || a == null || b == null) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>
        <Typography variant="body2">Select two visits above to compare their videos</Typography>
      </Box>
    )
  }

  const optionA = options.find((option) => option.key === a)
  const optionB = options.find((option) => option.key === b)
  const va = optionA?.visit
  const vb = optionB?.visit
  const videoA = optionA?.src
  const videoB = optionB?.src

  if (!videoA && !videoB) {
    return (
      <Box sx={{ textAlign: 'center', py: 3, color: '#94a3b8' }}>
        <Typography variant="body2">Neither selected visit has a video</Typography>
      </Box>
    )
  }

  const VideoSide = ({ visit, src, label }) => (
    <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 0 } }}>
      <Box sx={{
        background: label === 'VIDEO A' ? '#eff6ff' : '#f0fdf4',
        borderRadius: '8px 8px 0 0',
        px: 1.5,
        py: 0.75,
        borderBottom: `3px solid ${label === 'VIDEO A' ? '#2563eb' : '#22c55e'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
      }}>
        <Typography variant="caption" sx={{
          fontWeight: 800,
          color: label === 'VIDEO A' ? '#1d4ed8' : '#16a34a',
        }}>{label}</Typography>
        <Typography variant="caption" sx={{ color: '#64748b' }}>
          {visit?.date_of_visit ? dayjs(visit.date_of_visit).format('DD MMM YYYY') : ''}
        </Typography>
      </Box>
      <Box sx={{
        background: '#0f172a',
        borderRadius: '0 0 8px 8px',
        overflow: 'hidden',
        minHeight: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {src ? (
          <video
            src={src}
            controls
            preload="metadata"
            style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <Box textAlign="center" p={2}>
            <Typography variant="caption" sx={{ color: '#64748b' }}>No video for this visit</Typography>
          </Box>
        )}
      </Box>
      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5, px: 0.5 }}>
        {visit?.treatment}
      </Typography>
    </Box>
  )

  return (
    <Box>
      <Box display="flex" flexWrap="wrap" gap={2} mt={1}>
        <VideoSide visit={va} src={videoA} label="VIDEO A" />
        <VideoSide visit={vb} src={videoB} label="VIDEO B" />
      </Box>
    </Box>
  )
}

function OnlineVisitInfo({ v, onUpdateDispatch }) {
  const isDispatched = !!v.tracking_id
  return (
    <Box mt={1.5} sx={{
      background: isDispatched
        ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
        : 'linear-gradient(135deg, #f0fdfe, #e0f7fa)',
      border: `1.5px solid ${isDispatched ? '#86efac' : '#a5f3fc'}`,
      borderRadius: 2, p: 1.5,
    }}>
      {/* Payment row */}
      <Box display="flex" flexWrap="wrap" gap={2} mb={1}>
        <Box>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>💳 Payment Date & Time</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {v.payment_datetime ? dayjs(v.payment_datetime).format('DD MMM YYYY, h:mm A') : <em style={{ color: '#94a3b8' }}>Not recorded</em>}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>💰 Amount Paid</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>
            {v.amount_paid ? `₹${Number(v.amount_paid).toLocaleString('en-IN')}` : <em style={{ color: '#94a3b8' }}>—</em>}
          </Typography>
        </Box>
      </Box>

      {/* Dispatch row */}
      <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
        <Box>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>📅 Dispatch Date</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {v.dispatch_date ? dayjs(v.dispatch_date).format('DD MMM YYYY') : <em style={{ color: '#94a3b8' }}>Not dispatched yet</em>}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>🚚 Tracking ID</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', color: isDispatched ? '#0891b2' : undefined }}>
            {v.tracking_id || <em style={{ color: '#94a3b8' }}>Not available yet</em>}
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<LocalShippingIcon />}
            onClick={onUpdateDispatch}
            sx={{
              borderColor: '#06b6d4', color: '#0891b2', fontWeight: 600,
              '&:hover': { background: '#f0fdfe', borderColor: '#0891b2' }
            }}
          >
            {isDispatched ? 'Update Dispatch' : 'Mark Dispatched'}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

function BloodTestBadges({ tests }) {
  if (!tests || tests.length === 0) return null
  return (
    <Box mt={1.5} sx={{
      background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
      border: '1.5px solid #c4b5fd',
      borderRadius: 2, p: 1.5,
    }}>
      <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
        🧪 Blood Tests Prescribed ({tests.length})
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={0.6}>
        {tests.map((t, i) => (
          <Chip
            key={i}
            label={t}
            size="small"
            sx={{
              background: '#7c3aed',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.72rem',
            }}
          />
        ))}
      </Box>
    </Box>
  )
}






