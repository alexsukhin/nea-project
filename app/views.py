from flask import Blueprint, redirect, render_template, request, flash, jsonify, session
from flask_login import login_required, current_user
from .queries import *
import hashlib

views = Blueprint("views", __name__)

@views.route("/dashboard", methods=["GET", "POST"])
@login_required
def dashboard():
    if request.method == "POST":
        if "username" in request.form:
            username = request.form.get("username")
            recipient = getUser(username)

            senderID = current_user.id

            if recipient is None:
                flash("Username not found.", category="error")
            else:
                recipientID = recipient[0]

                if connectionExists(senderID, recipientID) == True:
                    flash("User already exists in your chat list.", category="error")
                elif senderID == recipientID:
                    flash("You cannot add yourself.", category="error")
                else:
                    insertConnection(senderID, recipientID)
                    flash("Successfully added user!", category="success")

        elif "message" in request.form:
            message = request.form.get("message")
            senderID = current_user.id
            recipientID = session.get("recipientID")

            #work out how to get sessionid here - may have to change database table
            #in the future i will need to get encryptedmessage from javascript file. senderid and recipientid will stay same

    return render_template("dashboard.html", user=current_user)


@views.route("/profile", methods=["GET", "POST"])
@login_required
def profile():
    if request.method == "POST":
        if "changeName" in request.form:
            firstName = request.form.get("firstName")
            lastName = request.form.get("lastName")

            if len(firstName) > 25:
                flash("First name must be 25 characters or less.", category="error")
            elif len(lastName) > 25:
                flash("Last name must be 25 characters or less.", category="error")
            else:
                updateName(current_user.id, firstName, lastName)
                flash("Successfully updated user's name!", category="success")
                return redirect("/profile")

        elif "changeUsername" in request.form:
            username = request.form.get("username")
            existingUser = getUser(username)

            if existingUser:
                flash("Username already exists", category="error")
            elif len(username) > 15:
                flash("Username must be 15 characters or less.", category="error")
            else:
                updateUsername(current_user.id, username)
                flash("Successfully updated username!", category="success")
                return redirect("/profile")

        elif "changePassword" in request.form:
            currentPassword = request.form.get("currentPassword")
            newPassword = request.form.get("newPassword")
            currentHashedPassword = hashlib.sha256(currentPassword.encode()).hexdigest()

            if currentHashedPassword != current_user.password:
                flash("Your current password is incorrect.", category="error")
            elif len(newPassword) > 50:
                flash("Password must be 50 characters or less.", category="error")
            else:
                updatePassword(current_user.id, newPassword)
                flash("Successfully updated password!", category="success")
                return redirect("/profile")

    return render_template("profile.html", user=current_user)


@views.route("/get-chat-users")
@login_required
def get_chat_users():
    chatUsers = getChatUsers(current_user.id)
    return jsonify(chatUsers)


@views.route("/get-chat-messages")
@login_required
def get_chat_messages():
    pass


@views.route("/check-conversation/<connectionID>")
@login_required
def check_conversation(connectionID):
    if conversationExists(connectionID):
        return jsonify(True)
    else:
        return jsonify(False)


@views.route("/get-connection-id/<senderID>/<recipientID>")
@login_required
def get_connection_id(senderID, recipientID):
    connectionID = getConnectionID(senderID, recipientID)
    return jsonify(connectionID)


@views.route("/get-conversation-id/<connectionID>")
@login_required
def get_conversation_id(connectionID):
    conversationID = getConversationID(connectionID)
    return jsonify(conversationID)


@views.route("/insert-conversation/<connectionID>")
@login_required
def insert_conversation(connectionID):
    insertConversation(connectionID)
    return jsonify({"message": "Conversation inserted successfully"})

@views.route("/insert-session/<conversationID>/<encryptedAESKey>/<socketID>/<senderID>")
@login_required
def insert_session(conversationID, encryptedAESKey, socketID, senderID):
    insertSession(conversationID, encryptedAESKey, socketID, senderID)
    return jsonify({"message": "Session inserted successfully"})

@views.route("/update-conversation/<conversationID>")
@login_required
def update_session(conversationID):
    updateConversation(conversationID)
    return jsonify({"message": "Conversation timestamp updated successfully"})

@views.route("/get-sender-id")
@login_required
def get_id():
    id = current_user.id
    return jsonify(id)

@views.route("/send-recipient-id/<recipientID>", methods=["POST"])
@login_required
def send_recipient_id(recipientID):
    session["recipientID"] = recipientID
    return jsonify({"message": "Recipient ID sent successfully"})

