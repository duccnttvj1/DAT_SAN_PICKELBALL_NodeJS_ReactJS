// Countdown.js – CHẮN CHẮN LÀ NHƯ VẬY
const Countdown = ({ seconds }) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return (
    <span>
      {mins}:{secs < 10 ? "0" : ""}
      {secs}
    </span>
  );
};

export default Countdown;
