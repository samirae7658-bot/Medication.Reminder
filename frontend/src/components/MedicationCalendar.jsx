import { Box, Typography, Paper, Tooltip } from "@mui/material";

function MedicationCalendar({ medications }) {
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const getDayStatus = (date) => {
    let takenCount = 0;
    let totalScheduled = 0;
    let missedCount = 0;

    medications.forEach(med => {
      const scheduledToday = med.scheduledTimes?.length || 0;
      const takenToday = med.taken?.[date]?.length || 0;
      
      totalScheduled += scheduledToday;
      takenCount += takenToday;

      // Logic for missed: if date is in the past and taken < scheduled
      const now = new Date().toISOString().split('T')[0];
      if (date < now && takenToday < scheduledToday) {
        missedCount += (scheduledToday - takenToday);
      }
    });

    if (totalScheduled === 0) return 'empty';
    if (takenCount === totalScheduled) return 'taken';
    if (missedCount > 0) return 'missed';
    return 'pending';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'taken': return '#4caf50'; // Green
      case 'missed': return '#f44336'; // Red
      case 'pending': return '#ff9800'; // Orange
      default: return '#e0e0e0'; // Grey
    }
  };

  return (
    <Box sx={{ mt: 4, mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>Weekly Progress</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        {last7Days.map(date => {
          const status = getDayStatus(date);
          const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = new Date(date).getDate();

          return (
            <Paper
              key={date}
              elevation={2}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                p: 1,
                borderRadius: 2,
                bgcolor: 'background.paper',
                borderTop: `4px solid ${getStatusColor(status)}`
              }}
            >
              <Typography variant="caption" color="text.secondary">{dayName}</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{dayNum}</Typography>
              <Box 
                sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  bgcolor: getStatusColor(status),
                  mt: 0.5 
                }} 
              />
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}

export default MedicationCalendar;
