import Conversation from '../models/Conversation.js';
import CloneProfile from '../models/Clone.js';
import mongoose from 'mongoose';

export const saveMessage = async (req, res) => {
  try {
    const { chatHistory } = req.body; 
    const { cloneId, userId } = req.body;

    const existing = await Conversation.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      cloneId
    });

    const messagesToAdd = chatHistory.map((pair) => [
      { role: 'user', content: pair.user },
      { role: 'clone', content: pair.bot.content }
    ]).flat();

    if (existing) {
      existing.messages.push(...messagesToAdd);
      await existing.save();
    } else {
      await Conversation.create({
        userId: new mongoose.Types.ObjectId(userId),
        cloneId,
        messages: messagesToAdd
      });
    }

    return res.status(200).json({ message: "Conversation saved." });
  } catch (error) {
    console.error("Error saving conversation:", error);
    return res.status(500).json({ error: "Failed to save conversation." });
  }
};

// Get all conversations (sessions) for a user
export const getUserConversations = async (req, res) => {
  try {
    const { userId, cloneId } = req.body;
    const conversation = await Conversation.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      cloneId,
    });

    if (!conversation) {
      return res.status(200).json({ messages: [] });
    }

    return res.status(200).json({ messages: conversation.messages });
  } catch (error) {
    console.error("❌ Error fetching conversation:", error);
    return res.status(500).json({ error: "Failed to fetch conversation" });
  }
};




export const getUserClonesWithDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[getUserClonesWithDetails] userId:', userId);

    const objectUserId = new mongoose.Types.ObjectId(userId);

    // Step 1: Get unique cloneIds the user has talked to
    const cloneIds = await Conversation.distinct('cloneId', { userId: objectUserId });
    console.log('[getUserClonesWithDetails] cloneIds:', cloneIds);

    if (cloneIds.length === 0) {
      console.log('[getUserClonesWithDetails] No conversations found for user.');
      return res.json({ clones: [] });
    }

    // Step 2: Fetch clone_name and image for each cloneId
    const clones = await CloneProfile.find(
      { clone_id: { $in: cloneIds } },
      { clone_id: 1, clone_name: 1, image: 1, _id: 0 }
    );

    console.log('[getUserClonesWithDetails] clones fetched:', clones);

    return res.json({ clones });
  } catch (error) {
    console.error('Error fetching clone details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};