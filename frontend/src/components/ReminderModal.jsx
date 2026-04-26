function ReminderModal({ activeReminder, setActiveReminder, handleMarkTaken, medications }) {
  if (!activeReminder) return null;

  return (
    <div>
      <h3>Reminder</h3>
      <p>{activeReminder.name}</p>

      <button onClick={() => {
        const med = medications.find(m => m.id === activeReminder.id);
        if (med) {
          handleMarkTaken(activeReminder.id, activeReminder.time, med);
        }
        setActiveReminder(null);
      }}>
        ✔ Taken
      </button>

      <button onClick={() => setActiveReminder(null)}>
        Close
      </button>
    </div>
  );
}

export default ReminderModal;