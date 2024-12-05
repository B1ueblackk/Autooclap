from flask import Flask, request, jsonify

from get_questions import handle_message, monitor_lesson_impl

app = Flask(__name__)

@app.route('/receive_message', methods=['POST'])
def receive_message():
    try:
        data = request.get_json()
        message = data.get('msg')
        print(f"Received message: {message}")
        ret = handle_message(message)
        return jsonify({"status": "success", "msg": ret})
    except:
        return jsonify({"status": "error", "msg": "backend wrong"})

@app.route('/monitor_lesson', methods=['POST'])
def monitor_lesson():
    try:
        data = request.get_json()
        message = data.get('lesson_code')
        print(f"Received message: {message}")
        flag, ret_msg = monitor_lesson_impl(message)
        return jsonify({"status": flag, "msg": ret_msg})
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)})

if __name__ == '__main__':
    app.run(port=5000)