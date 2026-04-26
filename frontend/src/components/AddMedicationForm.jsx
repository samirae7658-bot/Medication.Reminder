import { Button, TextField, Box } from "@mui/material";

function AddMedicationForm({ formData, handleChange, handleSubmit }) {
  return (
    <form onSubmit={handleSubmit}>
      <TextField
        fullWidth
        label="Medication Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        margin="normal"
      />

      <TextField
        fullWidth
        label="Instruction"
        name="instruction"
        value={formData.instruction}
        onChange={handleChange}
        margin="normal"
        multiline
        rows={3}
      />

      <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
        <TextField
          fullWidth
          label="Start Date"
          type="date"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          required
        />
        <TextField
          fullWidth
          label="Total Pills"
          type="number"
          name="totalPills"
          placeholder="e.g. 30"
          value={formData.totalPills}
          onChange={handleChange}
          required
        />
      </Box>

      <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
        Add Medication
      </Button>
    </form>
  );
}

export default AddMedicationForm;