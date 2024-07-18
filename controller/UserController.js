import UserModel from "../models/UserModel.js";
import path from "path";
import fs from "fs";
import argon2 from "argon2";
import { where } from "sequelize";

export const GetUsers = async (req, res) => {
  try {
    const response = await UserModel.findAll({
      attributes: ["uuid", "name", "email", "role", "image"],
    });
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

export const GetUserFotoAbsen = async (req, res) => {
  try {
    const response = await UserModel.findAll({
      attributes: ["uuid", "url_foto_absen", "name"],
    });
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

export const GetUsersById = async (req, res) => {
  try {
    const response = await UserModel.findOne({
      attributes: ["uuid", "name", "email", "password", "role", "url"],
      where: {
        uuid: req.params.id,
      },
    });
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

export const GetUsersByRole = async (req, res) => {
  try {
    const response = await UserModel.findAll({
      attributes: ["uuid", "name", "email", "role", "image", "url_foto_absen"],
      where: {
        role: req.params.role,
      },
    });
    if (response.length === 0)
      return res
        .status(404)
        .json({ msg: "Tidak ada pengguna dengan role ini" });
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

export const CreateUser = async (req, res) => {
  const { name, email, password, confPassword, role } = req.body;
  if (password !== confPassword)
    return res
      .status(400)
      .json({ msg: "Password Dan Confirm Password Tidak Cocok" });
  // const argon2 = require("argon2");
  const hashPassword = await argon2.hash(password);

  //   if (req.files || !req.files.file)
  //     return res.status(400).json({ msg: "No File Upload" });

  const file = req.files.file;
  const fileSize = file.data.length;
  const ext = path.extname(file.name);
  const fileName = file.md5 + ext;
  const url = `${req.protocol}://${req.get("host")}/images/${fileName}`;
  const allowedType = [".png", ".jpg", ".jpeg"];

  if (!allowedType.includes(ext.toLowerCase()))
    return res.status(422).json({ msg: "Invalid Images" });
  if (fileSize > 5000000)
    return res.status(422).json({ msg: "Image must be less than 5 MB" });

  const uploadPath = `./public/images/${fileName}`;

  file.mv(uploadPath, async (err) => {
    if (err) return res.status(500).json({ msg: err.message });
    try {
      await UserModel.create({
        name: name,
        email: email,
        password: hashPassword,
        role: role,
        image: fileName,
        url,
      });
      res.status(201).json({ msg: "Register Berhasil" });
    } catch (error) {
      res.status(400).json({ msg: error.message });
    }
  });
};

export const UpdateUser = async (req, res) => {
  const user = await UserModel.findOne({
    where: {
      uuid: req.params.id,
    },
  });
  if (!user) return res.status(404).json({ msg: "User Tidak di Temukan" });
  const { name, email, password, confPassword, role } = req.body;
  let hashPassword;
  let fileName;
  if (req.files == null) {
    fileName = user.image;
  } else {
    const file = req.files.file;
    const fileSize = file.data.length;
    const ext = path.extname(file.name);
    fileName = file.md5 + ext;
    const allowedType = [".png", ".jpg", ".jpeg"];

    if (!allowedType.includes(ext.toLowerCase()))
      return res.status(422).json({ msg: "Invalid Images" });
    if (fileSize > 5000000)
      return res.status(422).json({ msg: "Image must be less than 5 MB" });

    const filepath = `./public/images/${user.image}`;
    fs.unlinkSync(filepath);

    file.mv(`./public/images/${fileName}`, (err) => {
      if (err) return res.status(500).json({ msg: err.message });
    });
  }
  const url = `${req.protocol}://${req.get("host")}/images/${fileName}`;

  if (password === user.password) {
    hashPassword = user.password;
  } else {
    // pengecekan password nya sama atau tidak dengan confPassword
    if (password !== confPassword)
      // Jika tidak sama maka muncul respon 400 dengan pesan password dan confirm password tidak cocok
      return res
        .status(400)
        .json({ msg: "Password Dan Confirm Password Tidak Cocok" });

    hashPassword = await argon2.hash(password);
  }

  // Jika cocok maka langsung masukan ke database dengan method updatee
  try {
    await UserModel.update(
      {
        name: name,
        email: email,
        password: hashPassword,
        role: role,
        image: fileName,
        url,
      },
      {
        where: {
          id: user.id,
        },
      }
    );
    res.status(201).json({ msg: "Update Berhasil" });
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
};

// export const DeleteUser = async (req, res) => {
//   const user = await UserModel.findOne({
//     where: {
//       uuid: req.params.id,
//     },
//   });
//   if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });
//   try {
//     const filepath = `./public/images/${user.image}`;
//     fs.unlinkSync(filepath);
//     await user.destroy({
//       where: {
//         id: user.id,
//       },
//     });
//     res
//       .status(200)
//       .json({ msg: `Berhasil Delete Data Dengan Username ${user.name}` });
//   } catch (error) {
//     res.status(400).json({ msg: error.message });
//   }
// };

export const DeleteUser = async (req, res) => {
  // return res
  //   .status(500)
  //   .json({ msg: req.params.id });

  try {
    const user = await UserModel.findOne({
      where: {
        uuid: req.params.id, // Pastikan Anda menggunakan `uuid` untuk mencari
      },
    });

    if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });

    const filepath = `./public/images/${user.image}`;
    fs.unlinkSync(filepath);

    // const filepath2 = `./public/absen/${user.foto_absen}`;
    // fs.unlinkSync(filepath2);//

    await user.destroy(); // Menghapus langsung berdasarkan instance user

    res
      .status(200)
      .json({ msg: `Berhasil Delete Data Dengan Username ${user.name}` });
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
};

export const UpdateForFotoAbsen = async (req, res) => {
  const user = await UserModel.findOne({
    where: {
      uuid: req.params.id,
    },
  });
  if (!user) return res.status(404).json({ msg: "User Tidak di Temukan" });
  let fileName;
  if (req.files == null) {
    fileName = user.foto_absen;
  } else {
    const file = req.files.file;
    const fileSize = file.data.length;
    const ext = path.extname(file.name);
    fileName = file.md5 + ext;
    const allowedType = [".png", ".jpg", ".jpeg"];

    if (!allowedType.includes(ext.toLowerCase()))
      return res.status(422).json({ msg: "Invalid Images" });
    if (fileSize > 5000000)
      return res.status(422).json({ msg: "Image must be less than 5 MB" });

    file.mv(`./public/absen/${fileName}`, (err) => {
      if (err) return res.status(500).json({ msg: err.message });
    });
  }
  const url_foto_absen = `${req.protocol}://${req.get(
    "host"
  )}/absen/${fileName}`;

  try {
    await UserModel.update(
      {
        foto_absen: fileName,
        url_foto_absen,
      },
      {
        where: {
          uuid: req.params.id,
        },
      }
    );
    res.status(201).json({ msg: "Update Berhasil" });
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
};
