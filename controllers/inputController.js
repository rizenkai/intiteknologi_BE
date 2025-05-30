const InputValue = require('../models/InputValue');

// Controller untuk mengelola nilai input
exports.getAllValues = async (req, res) => {
  try {
    const { testType, category } = req.query;
    
    // Filter berdasarkan tipe pengujian dan kategori jika disediakan
    const filter = {};
    if (testType) filter.testType = testType;
    if (category) filter.category = category;
    
    const values = await InputValue.find(filter).sort({ value: 1 });
    res.status(200).json(values);
  } catch (error) {
    console.error('Error getting input values:', error);
    res.status(500).json({ message: 'Server error while fetching input values' });
  }
};

exports.getValueById = async (req, res) => {
  try {
    const value = await InputValue.findById(req.params.id);
    if (!value) {
      return res.status(404).json({ message: 'Input value not found' });
    }
    res.status(200).json(value);
  } catch (error) {
    console.error('Error getting input value:', error);
    res.status(500).json({ message: 'Server error while fetching input value' });
  }
};

exports.createValue = async (req, res) => {
  try {
    const { value, category, testType } = req.body;
    
    // Validasi input
    if (!value || value.trim() === '') {
      return res.status(400).json({ message: 'Value is required' });
    }
    
    if (!category || !['mutuBahan', 'tipeBahan'].includes(category)) {
      return res.status(400).json({ message: 'Valid category is required (mutuBahan or tipeBahan)' });
    }
    
    if (!testType || !['Besi', 'Beton'].includes(testType)) {
      return res.status(400).json({ message: 'Valid test type is required (Besi or Beton)' });
    }
    
    // Validasi format untuk mutu bahan
    if (category === 'mutuBahan') {
      const prefix = testType === 'Besi' ? 'T' : 'K';
      if (!value.startsWith(prefix)) {
        return res.status(400).json({ 
          message: `Mutu Bahan for ${testType} should start with "${prefix}"` 
        });
      }
    }
    
    // Cek apakah nilai dengan nama yang sama sudah ada
    const existingValue = await InputValue.findOne({ 
      value: { $regex: new RegExp(`^${value}$`, 'i') },
      category,
      testType
    });
    
    if (existingValue) {
      return res.status(400).json({ 
        message: 'This value already exists for the selected category and test type' 
      });
    }
    
    // Buat objek baru dengan nilai untuk field lama dan baru
    const newValue = new InputValue({
      // Set name dan typeId ke nilai default untuk menghindari error duplikasi
      name: value, // Gunakan value sebagai name untuk kompatibilitas
      typeId: null, // Set typeId ke null
      // Field utama
      value,
      category,
      testType
    });
    
    await newValue.save();
    
    res.status(201).json(newValue);
  } catch (error) {
    console.error('Error creating input value:', error);
    res.status(500).json({ message: 'Server error while creating input value', error: error.message });
  }
};

exports.updateValue = async (req, res) => {
  try {
    const { value, category, testType } = req.body;
    
    // Validasi input
    if (!value || value.trim() === '') {
      return res.status(400).json({ message: 'Value is required' });
    }
    
    if (!category || !['mutuBahan', 'tipeBahan'].includes(category)) {
      return res.status(400).json({ message: 'Valid category is required (mutuBahan or tipeBahan)' });
    }
    
    if (!testType || !['Besi', 'Beton'].includes(testType)) {
      return res.status(400).json({ message: 'Valid test type is required (Besi or Beton)' });
    }
    
    // Validasi format untuk mutu bahan
    if (category === 'mutuBahan') {
      const prefix = testType === 'Besi' ? 'T' : 'K';
      if (!value.startsWith(prefix)) {
        return res.status(400).json({ 
          message: `Mutu Bahan for ${testType} should start with "${prefix}"` 
        });
      }
    }
    
    // Cek apakah nilai dengan nama yang sama sudah ada (selain nilai yang sedang diupdate)
    const existingValue = await InputValue.findOne({ 
      value: { $regex: new RegExp(`^${value}$`, 'i') },
      category,
      testType,
      _id: { $ne: req.params.id }
    });
    
    if (existingValue) {
      return res.status(400).json({ 
        message: 'This value already exists for the selected category and test type' 
      });
    }
    
    const updatedValue = await InputValue.findByIdAndUpdate(
      req.params.id,
      { value, category, testType },
      { new: true, runValidators: true }
    );
    
    if (!updatedValue) {
      return res.status(404).json({ message: 'Input value not found' });
    }
    
    res.status(200).json(updatedValue);
  } catch (error) {
    console.error('Error updating input value:', error);
    res.status(500).json({ message: 'Server error while updating input value' });
  }
};

exports.deleteValue = async (req, res) => {
  try {
    const deletedValue = await InputValue.findByIdAndDelete(req.params.id);
    if (!deletedValue) {
      return res.status(404).json({ message: 'Input value not found' });
    }
    
    res.status(200).json({ message: 'Input value deleted successfully' });
  } catch (error) {
    console.error('Error deleting input value:', error);
    res.status(500).json({ message: 'Server error while deleting input value' });
  }
};
