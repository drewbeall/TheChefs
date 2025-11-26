async function getTranscript() {
  const url = document.getElementById("url").value;

  const response = await fetch("http://localhost:3001/transcript", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url })
    //consol.log("body", body)
  });

  const data = await response.json();
  document.getElementById("output").innerText = JSON.stringify(data, null, 2);
}
