import { Card, CardContent, Typography, Button, Box, IconButton } from "@mui/material";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

function MedicationCard({ med, handleDelete, handleMarkTaken }) {
  return (
    <Card sx={{ mb: 2, borderRadius: 3, boxShadow: 2, borderLeft: '6px solid', borderLeftColor: 'primary.main' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
              {med.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {med.instruction}
            </Typography>
          </Box>
          <IconButton onClick={() => handleDelete(med.id)} size="small" color="error">
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography variant="caption" display="block" sx={{ mb: 2, color: 'text.secondary' }}>
          Progress: <strong>{med.pillsTaken || 0}</strong> / {med.totalPills || 0} pills
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {med.scheduledTimes?.map(time => {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            const isTaken = med.taken?.[today]?.includes(time);
            const isMissed = !isTaken && time !== 'Anytime' && currentHHmm > time;

            return (
              <Button
                key={time}
                variant={isTaken ? "outlined" : (isMissed ? "outlined" : "contained")}
                color={isTaken ? "success" : (isMissed ? "error" : "primary")}
                onClick={() => handleMarkTaken(med.id, time, med)}
                disabled={isTaken}
                size="small"
                sx={{ 
                  borderRadius: 2, 
                  textTransform: 'none',
                  minWidth: '80px',
                  fontWeight: 'bold'
                }}
              >
                {isTaken ? `✔️ ${time}` : (isMissed ? `❌ Missed` : time)}
              </Button>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}

export default MedicationCard;