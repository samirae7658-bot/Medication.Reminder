import { Card, CardContent, Typography, Button } from "@mui/material";

function MedicationCard({ med, handleDelete, handleMarkTaken }) {
  return (
    <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
      <CardContent>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {med.name}
          </Typography>

          <button onClick={() => handleDelete(med.id)}>
            ✕
          </button>
        </div>

        <Typography variant="body2">
          {med.instruction}
        </Typography>

        <Typography>
          Pills: {med.pillsTaken || 0} / {med.totalPills || 0}
        </Typography>

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
              sx={{ m: 0.5, textTransform: 'none' }}
            >
              {isTaken ? `✔️ ${time}` : (isMissed ? `Missed: ${time}` : time)}
            </Button>
          );
        })}


      </CardContent>
    </Card>
  );
}

export default MedicationCard;